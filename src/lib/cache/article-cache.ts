import "server-only";

import type { NewsArticle } from "@/types";
import { getRedisAdapter } from "./redis-client";

const ZSET_KEY = "news:articles:24h:zset";
const HASH_KEY = "news:articles:24h:hash";
const META_KEY = "news:articles:24h:meta";
const LOCATIONS_KEY = "news:articles:24h:locations";

const DEFAULT_TTL_SECONDS = 10 * 60;
const CACHE_TTL_SECONDS =
  Number(process.env.NEWS_CACHE_TTL_SECONDS) || DEFAULT_TTL_SECONDS;

const ZADD_CHUNK_SIZE = 200;
const HASH_CHUNK_SIZE = 100;
const HASH_CHUNK_MAX_BYTES = 256 * 1024;

type SerializedArticle = Omit<NewsArticle, "timestamp"> & { timestamp: string };

export type CacheLayer = "redis-upstash" | "redis-url" | "memory" | "db";

export type CachedPageResult = {
  cacheHit: boolean;
  cacheLayer: CacheLayer;
  isStale: boolean;
  cacheAgeMs: number;
  totalCount: number;
  maxPublishedAt: string | null;
  articles: NewsArticle[];
};

function serializeArticle(article: NewsArticle): SerializedArticle {
  return { ...article, timestamp: article.timestamp.toISOString() };
}

function deserializeArticle(article: SerializedArticle): NewsArticle {
  return { ...article, timestamp: new Date(article.timestamp) };
}

function articleScore(article: SerializedArticle): number {
  return new Date(article.timestamp).getTime();
}

// --- Integrity check via Lua (replaces MULTI/EXEC which is blocked on Upstash REST) ---

const INTEGRITY_SCRIPT = `
local zset_count = redis.call('ZCARD', KEYS[1])
local meta_count = tonumber(redis.call('HGET', KEYS[2], 'totalCount'))
if meta_count == nil then return 1 end
if math.abs(zset_count - meta_count) > 10 then
  return 0
end
return 1
`;

async function verifyCacheIntegrity(): Promise<boolean> {
  const adapter = await getRedisAdapter();
  if (!adapter) return true;
  try {
    const result = await adapter.evalScript(INTEGRITY_SCRIPT, [ZSET_KEY, META_KEY], []);
    return result === 1 || result === "1";
  } catch {
    return false;
  }
}

// --- Read path ---

export async function getCachedPage(
  offset: number,
  limit: number
): Promise<CachedPageResult> {
  const adapter = await getRedisAdapter();
  const emptyResult: CachedPageResult = {
    cacheHit: false,
    cacheLayer: "memory",
    isStale: false,
    cacheAgeMs: 0,
    totalCount: 0,
    maxPublishedAt: null,
    articles: [],
  };

  if (!adapter) return emptyResult;

  try {
    const [count, metaRaw] = await Promise.all([
      adapter.zCard(ZSET_KEY),
      adapter.hGetAll(META_KEY),
    ]);

    const layer: CacheLayer = adapter.mode === "upstash" ? "redis-upstash" : "redis-url";

    if (count === 0) {
      return { ...emptyResult, cacheLayer: layer };
    }

    const ids = await adapter.zRangeRev(ZSET_KEY, offset, offset + limit - 1);
    if (ids.length === 0) {
      return {
        cacheHit: true,
        cacheLayer: layer,
        isStale: false,
        cacheAgeMs: 0,
        totalCount: Number(metaRaw.totalCount || count),
        maxPublishedAt: metaRaw.maxPublishedAt || null,
        articles: [],
      };
    }

    const payloads = await adapter.hGetMany(HASH_KEY, ids);

    const articles: NewsArticle[] = [];
    for (const payload of payloads) {
      if (!payload) continue;
      try {
        articles.push(deserializeArticle(JSON.parse(payload) as SerializedArticle));
      } catch {
        // skip malformed
      }
    }

    const updatedAt = Number(metaRaw.updatedAt || 0);
    const cacheAgeMs = updatedAt ? Date.now() - updatedAt : 0;

    if (ids.length > 0 && articles.length === 0) {
      return {
        cacheHit: false,
        cacheLayer: layer,
        isStale: true,
        cacheAgeMs,
        totalCount: Number(metaRaw.totalCount || count),
        maxPublishedAt: metaRaw.maxPublishedAt || null,
        articles: [],
      };
    }

    return {
      cacheHit: true,
      cacheLayer: layer,
      isStale: cacheAgeMs > CACHE_TTL_SECONDS * 1000,
      cacheAgeMs,
      totalCount: Number(metaRaw.totalCount || count),
      maxPublishedAt: metaRaw.maxPublishedAt || articles[0]?.timestamp.toISOString() || null,
      articles,
    };
  } catch (error) {
    console.warn("[Beacon] Redis cache read failed", error);
    return emptyResult;
  }
}

// --- Write path: Blue/Green atomic cache warm via RENAME ---

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function chunkHashMapping(
  mapping: Record<string, string>,
  maxFields: number,
  maxBytes: number
): Record<string, string>[] {
  const chunks: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  let currentFields = 0;
  let currentBytes = 0;

  for (const [field, value] of Object.entries(mapping)) {
    const itemBytes = field.length + value.length + 16;
    if (currentFields >= maxFields || (currentFields > 0 && currentBytes + itemBytes > maxBytes)) {
      chunks.push(current);
      current = {};
      currentFields = 0;
      currentBytes = 0;
    }
    current[field] = value;
    currentFields += 1;
    currentBytes += itemBytes;
  }

  if (currentFields > 0) chunks.push(current);
  return chunks;
}

export async function setCachedWindow(articles: NewsArticle[]): Promise<CacheLayer> {
  const adapter = await getRedisAdapter();
  if (!adapter) return "memory";

  const serialized = articles.map(serializeArticle);
  const version = Date.now();
  const stagingZset = `news:articles:staging:${version}:zset`;
  const stagingHash = `news:articles:staging:${version}:hash`;

  try {
    const entries = serialized.map((a) => ({ score: articleScore(a), member: a.id }));
    for (const chunk of chunkArray(entries, ZADD_CHUNK_SIZE)) {
      const p = adapter.pipeline();
      for (const e of chunk) {
        p.zadd(stagingZset, e.score, e.member);
      }
      await p.exec();
    }

    const hashPayload = Object.fromEntries(
      serialized.map((a) => [a.id, JSON.stringify(a)])
    );
    for (const chunk of chunkHashMapping(hashPayload, HASH_CHUNK_SIZE, HASH_CHUNK_MAX_BYTES)) {
      await adapter.hSetMany(stagingHash, chunk);
    }

    await adapter.pipeline()
      .rename(stagingZset, ZSET_KEY)
      .rename(stagingHash, HASH_KEY)
      .expire(ZSET_KEY, CACHE_TTL_SECONDS)
      .expire(HASH_KEY, CACHE_TTL_SECONDS)
      .hset(META_KEY, {
        totalCount: String(serialized.length),
        updatedAt: String(Date.now()),
        maxPublishedAt: serialized[0]?.timestamp ?? "",
        version: String(version),
      })
      .expire(META_KEY, CACHE_TTL_SECONDS)
      .exec();

    return adapter.mode === "upstash" ? "redis-upstash" : "redis-url";
  } catch (error) {
    console.warn("[Beacon] Blue/green cache warm failed, cleaning staging keys", error);
    await adapter.del(stagingZset, stagingHash).catch(() => {});
    return "memory";
  }
}

// --- Write path: Per-article write-through (called by AI Edge Function) ---

const WRITE_THROUGH_SCRIPT = `
local existing = redis.call('ZSCORE', KEYS[1], ARGV[1])
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])
redis.call('HSET', KEYS[2], ARGV[1], ARGV[3])
redis.call('HSET', KEYS[3], ARGV[4], ARGV[5])
if existing == false then
  redis.call('HINCRBY', KEYS[4], 'totalCount', 1)
end
local currentMax = redis.call('HGET', KEYS[4], 'maxPublishedAt')
if currentMax == false or ARGV[6] > currentMax then
  redis.call('HSET', KEYS[4], 'maxPublishedAt', ARGV[6])
end
return 1
`;

export async function writeArticleToCache(article: NewsArticle): Promise<void> {
  const adapter = await getRedisAdapter();
  if (!adapter) return;

  const serialized = serializeArticle(article);
  const score = articleScore(serialized);

  try {
    await adapter.evalScript(
      WRITE_THROUGH_SCRIPT,
      [ZSET_KEY, HASH_KEY, LOCATIONS_KEY, META_KEY],
      [
        article.id,
        String(score),
        JSON.stringify(serialized),
        article.location.name,
        JSON.stringify({
          name: article.location.name,
          lat: article.location.lat,
          lng: article.location.lng,
          country: article.location.country,
          region: article.location.region,
        }),
        serialized.timestamp,
      ],
    );
  } catch (error) {
    console.warn("[Beacon] Per-article cache write failed", error);
  }
}

// --- Upsert (for realtime updates to existing articles) ---

export async function upsertCachedArticle(article: NewsArticle): Promise<void> {
  return writeArticleToCache(article);
}

// --- Integrity ---

export { verifyCacheIntegrity };

export function getMemoryCacheAgeMs(): number {
  return 0;
}
