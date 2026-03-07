import type { NewsArticle } from "@/types";
import { getRedisAdapter } from "./redis-client";

const ZSET_KEY = "news:articles:24h:zset";
const HASH_KEY = "news:articles:24h:hash";
const META_KEY = "news:articles:24h:meta";

const DEFAULT_TTL_SECONDS = 10 * 60;
const CACHE_TTL_SECONDS =
  Number(process.env.NEWS_CACHE_TTL_SECONDS) || DEFAULT_TTL_SECONDS;

type SerializedArticle = Omit<NewsArticle, "timestamp"> & { timestamp: string };

type CacheMeta = {
  updatedAt: number;
  maxPublishedAt: string | null;
  totalCount: number;
};

type MemoryCache = {
  articles: SerializedArticle[];
  updatedAt: number;
};

let memoryCache: MemoryCache = { articles: [], updatedAt: 0 };

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
  return {
    ...article,
    timestamp: article.timestamp.toISOString(),
  };
}

function deserializeArticle(article: SerializedArticle): NewsArticle {
  return {
    ...article,
    timestamp: new Date(article.timestamp),
  };
}

function articleScore(article: SerializedArticle): number {
  return new Date(article.timestamp).getTime();
}

function buildMeta(serialized: SerializedArticle[]): CacheMeta {
  return {
    updatedAt: Date.now(),
    maxPublishedAt: serialized[0]?.timestamp ?? null,
    totalCount: serialized.length,
  };
}

function getMemoryPage(offset: number, limit: number): CachedPageResult {
  const page = memoryCache.articles.slice(offset, offset + limit);
  const cacheAgeMs = memoryCache.updatedAt ? Date.now() - memoryCache.updatedAt : 0;
  return {
    cacheHit: page.length > 0 || memoryCache.articles.length > 0,
    cacheLayer: "memory",
    isStale: cacheAgeMs > CACHE_TTL_SECONDS * 1000,
    cacheAgeMs,
    totalCount: memoryCache.articles.length,
    maxPublishedAt: memoryCache.articles[0]?.timestamp ?? null,
    articles: page.map(deserializeArticle),
  };
}

async function getRedisPage(
  offset: number,
  limit: number
): Promise<CachedPageResult | null> {
  const adapter = await getRedisAdapter();
  if (!adapter) return null;

  try {
    const [count, metaRaw] = await Promise.all([
      adapter.zCard(ZSET_KEY),
      adapter.hGetAll(META_KEY),
    ]);

    if (count === 0) {
      return {
        cacheHit: false,
        cacheLayer: adapter.mode === "upstash" ? "redis-upstash" : "redis-url",
        isStale: false,
        cacheAgeMs: 0,
        totalCount: 0,
        maxPublishedAt: null,
        articles: [],
      };
    }

    const ids = await adapter.zRangeRev(ZSET_KEY, offset, offset + limit - 1);
    const payloads = await adapter.hGetMany(HASH_KEY, ids);

    const serialized = payloads
      .map((payload) => {
        if (!payload) return null;
        try {
          return JSON.parse(payload) as SerializedArticle;
        } catch {
          return null;
        }
      })
      .filter((article): article is SerializedArticle => article !== null);

    const updatedAt = Number(metaRaw.updatedAt || 0);
    const cacheAgeMs = updatedAt ? Date.now() - updatedAt : 0;
    const pageLooksCorrupt = ids.length > 0 && serialized.length === 0;

    if (pageLooksCorrupt) {
      return {
        cacheHit: false,
        cacheLayer: adapter.mode === "upstash" ? "redis-upstash" : "redis-url",
        isStale: true,
        cacheAgeMs,
        totalCount: Number(metaRaw.totalCount || count),
        maxPublishedAt: metaRaw.maxPublishedAt || null,
        articles: [],
      };
    }

    return {
      cacheHit: true,
      cacheLayer: adapter.mode === "upstash" ? "redis-upstash" : "redis-url",
      isStale: cacheAgeMs > CACHE_TTL_SECONDS * 1000,
      cacheAgeMs,
      totalCount: Number(metaRaw.totalCount || count),
      maxPublishedAt: metaRaw.maxPublishedAt || serialized[0]?.timestamp || null,
      articles: serialized.map(deserializeArticle),
    };
  } catch (error) {
    console.warn("[Beacon] Redis cache read failed, falling back to memory", error);
    return null;
  }
}

export async function getCachedPage(
  offset: number,
  limit: number
): Promise<CachedPageResult> {
  const redisPage = await getRedisPage(offset, limit);
  if (redisPage) return redisPage;
  return getMemoryPage(offset, limit);
}

async function verifyRedisWindowIntegrity(expectedCount: number): Promise<boolean> {
  const adapter = await getRedisAdapter();
  if (!adapter) return true;

  try {
    const totalCount = await adapter.zCard(ZSET_KEY);
    return totalCount === expectedCount;
  } catch {
    return false;
  }
}

export async function setCachedWindow(articles: NewsArticle[]): Promise<CacheLayer> {
  const serialized = articles.map(serializeArticle);
  memoryCache = { articles: serialized, updatedAt: Date.now() };

  const adapter = await getRedisAdapter();
  if (!adapter) {
    return "memory";
  }

  try {
    await adapter.del(ZSET_KEY, HASH_KEY, META_KEY);
    const entries = serialized.map((article) => ({
      score: articleScore(article),
      member: article.id,
    }));
    const hashPayload = Object.fromEntries(
      serialized.map((article) => [article.id, JSON.stringify(article)])
    );
    await adapter.zAddMany(ZSET_KEY, entries);
    await adapter.hSetMany(HASH_KEY, hashPayload);
    const isRedisConsistent = await verifyRedisWindowIntegrity(serialized.length);
    if (!isRedisConsistent) {
      throw new Error("[Beacon] Redis integrity check failed after cache write");
    }
    const meta = buildMeta(serialized);
    await adapter.hSetMany(META_KEY, {
      updatedAt: String(meta.updatedAt),
      maxPublishedAt: meta.maxPublishedAt ?? "",
      totalCount: String(meta.totalCount),
    });

    await Promise.all([
      adapter.expire(ZSET_KEY, CACHE_TTL_SECONDS),
      adapter.expire(HASH_KEY, CACHE_TTL_SECONDS),
      adapter.expire(META_KEY, CACHE_TTL_SECONDS),
    ]);

    return adapter.mode === "upstash" ? "redis-upstash" : "redis-url";
  } catch (error) {
    console.warn("[Beacon] Redis cache write failed, memory cache kept", error);
    return "memory";
  }
}

export async function upsertCachedArticle(article: NewsArticle): Promise<void> {
  const serialized = serializeArticle(article);

  // Always keep memory fallback warm
  const existingIndex = memoryCache.articles.findIndex((item) => item.id === article.id);
  if (existingIndex >= 0) {
    memoryCache.articles.splice(existingIndex, 1);
  }
  const insertIndex = memoryCache.articles.findIndex(
    (item) => new Date(item.timestamp).getTime() < article.timestamp.getTime()
  );
  if (insertIndex === -1) {
    memoryCache.articles.push(serialized);
  } else {
    memoryCache.articles.splice(insertIndex, 0, serialized);
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  memoryCache.articles = memoryCache.articles.filter(
    (item) => new Date(item.timestamp).getTime() >= cutoff
  );
  memoryCache.updatedAt = Date.now();

  const adapter = await getRedisAdapter();
  if (!adapter) return;

  try {
    const score = article.timestamp.getTime();
    await adapter.zAddMany(ZSET_KEY, [{ score, member: article.id }]);
    await adapter.hSetOne(HASH_KEY, article.id, JSON.stringify(serialized));
    await adapter.zRemRangeByScore(ZSET_KEY, Number.NEGATIVE_INFINITY, cutoff - 1);

    const totalCount = await adapter.zCard(ZSET_KEY);
    await adapter.hSetMany(META_KEY, {
      updatedAt: String(Date.now()),
      maxPublishedAt: memoryCache.articles[0]?.timestamp ?? "",
      totalCount: String(totalCount),
    });
    await Promise.all([
      adapter.expire(ZSET_KEY, CACHE_TTL_SECONDS),
      adapter.expire(HASH_KEY, CACHE_TTL_SECONDS),
      adapter.expire(META_KEY, CACHE_TTL_SECONDS),
    ]);
  } catch (error) {
    console.warn("[Beacon] Redis incremental cache update failed", error);
  }
}

export async function clearCachedWindow(): Promise<void> {
  memoryCache = { articles: [], updatedAt: 0 };
  const adapter = await getRedisAdapter();
  if (!adapter) return;
  try {
    await adapter.del(ZSET_KEY, HASH_KEY, META_KEY);
  } catch (error) {
    console.warn("[Beacon] Failed clearing Redis cache", error);
  }
}

export function getMemoryCacheAgeMs(): number {
  return memoryCache.updatedAt ? Date.now() - memoryCache.updatedAt : 0;
}

