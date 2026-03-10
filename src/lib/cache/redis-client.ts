const env = process.env;

type RedisEntry = {
  score: number;
  member: string;
};

const UPSTASH_ZADD_CHUNK_SIZE = 200;
const UPSTASH_HASH_CHUNK_SIZE = 100;
const UPSTASH_HASH_CHUNK_MAX_BYTES = 256 * 1024;

type RedisScoreBound = number | "-inf" | "+inf";

export interface RedisAdapter {
  readonly mode: "upstash" | "redis-url";
  zCard: (key: string) => Promise<number>;
  zRangeRev: (key: string, start: number, stop: number) => Promise<string[]>;
  zAddMany: (key: string, entries: RedisEntry[]) => Promise<void>;
  zRemRangeByScore: (key: string, min: RedisScoreBound, max: RedisScoreBound) => Promise<void>;
  hGetMany: (key: string, fields: string[]) => Promise<(string | null)[]>;
  hSetMany: (key: string, mapping: Record<string, string>) => Promise<void>;
  hSetOne: (key: string, field: string, value: string) => Promise<void>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hIncrBy: (key: string, field: string, increment: number) => Promise<number>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  rename: (oldKey: string, newKey: string) => Promise<void>;
  evalScript: (script: string, keys: string[], args: string[]) => Promise<unknown>;
  pipeline: () => PipelineBuilder;
  del: (...keys: string[]) => Promise<void>;
  expire: (key: string, seconds: number) => Promise<void>;
}

export interface PipelineBuilder {
  zadd: (key: string, score: number, member: string) => PipelineBuilder;
  hset: (key: string, mapping: Record<string, string>) => PipelineBuilder;
  hincrby: (key: string, field: string, increment: number) => PipelineBuilder;
  rename: (oldKey: string, newKey: string) => PipelineBuilder;
  expire: (key: string, seconds: number) => PipelineBuilder;
  del: (...keys: string[]) => PipelineBuilder;
  exec: () => Promise<unknown[]>;
}

let adapterPromise: Promise<RedisAdapter | null> | null = null;

function normalizeScoreBound(
  bound: RedisScoreBound,
  fallbackInfinity: "-inf" | "+inf"
): number | "-inf" | "+inf" {
  if (bound === "-inf" || bound === "+inf") return bound;
  if (!Number.isFinite(bound)) return fallbackInfinity;
  return bound;
}

function chunkEntries<T>(entries: T[], size: number): T[][] {
  if (entries.length === 0) return [];
  const chunks: T[][] = [];
  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size));
  }
  return chunks;
}

function estimateHashFieldSize(field: string, value: string): number {
  // Keep chunk payloads comfortably under request limits.
  return field.length + value.length + 16;
}

function chunkHashMapping(
  mapping: Record<string, string>,
  maxFields: number,
  maxApproxBytes: number
): Record<string, string>[] {
  const chunks: Record<string, string>[] = [];
  let current: Record<string, string> = {};
  let currentFields = 0;
  let currentBytes = 0;

  for (const [field, value] of Object.entries(mapping)) {
    const itemBytes = estimateHashFieldSize(field, value);
    const exceedsFieldLimit = currentFields >= maxFields;
    const exceedsByteLimit = currentFields > 0 && currentBytes + itemBytes > maxApproxBytes;
    if (exceedsFieldLimit || exceedsByteLimit) {
      chunks.push(current);
      current = {};
      currentFields = 0;
      currentBytes = 0;
    }
    current[field] = value;
    currentFields += 1;
    currentBytes += itemBytes;
  }

  if (currentFields > 0) {
    chunks.push(current);
  }

  return chunks;
}

async function createUpstashAdapter(): Promise<RedisAdapter | null> {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const { Redis } = await import("@upstash/redis");
  const client = new Redis({
    url,
    token,
    automaticDeserialization: false,
  });

  return {
    mode: "upstash",
    zCard: async (key) => {
      const count = await client.zcard(key);
      return typeof count === "number" ? count : Number(count || 0);
    },
    zRangeRev: async (key, start, stop) => {
      const result = await client.zrange(key, start, stop, { rev: true });
      if (!Array.isArray(result)) return [];
      return result.map((item) => String(item));
    },
    zAddMany: async (key, entries) => {
      if (entries.length === 0) return;
      for (const chunk of chunkEntries(entries, UPSTASH_ZADD_CHUNK_SIZE)) {
        const [first, ...rest] = chunk.map((entry) => ({
          score: entry.score,
          member: entry.member,
        }));
        if (!first) continue;
        await client.zadd(key, first, ...rest);
      }
    },
    zRemRangeByScore: async (key, min, max) => {
      const safeMin = normalizeScoreBound(min, "-inf");
      const safeMax = normalizeScoreBound(max, "+inf");
      await client.zremrangebyscore(key, safeMin, safeMax);
    },
    hGetMany: async (key, fields) => {
      if (fields.length === 0) return [];
      const values = await client.hmget(key, ...fields);
      if (Array.isArray(values)) {
        return values.map((value) =>
          typeof value === "string" ? value : value == null ? null : String(value)
        );
      }
      if (values && typeof values === "object") {
        const map = values as Record<string, unknown>;
        return fields.map((field) => {
          const value = map[field];
          return typeof value === "string"
            ? value
            : value == null
              ? null
              : String(value);
        });
      }
      return [];
    },
    hSetMany: async (key, mapping) => {
      if (Object.keys(mapping).length === 0) return;
      for (const chunk of chunkHashMapping(
        mapping,
        UPSTASH_HASH_CHUNK_SIZE,
        UPSTASH_HASH_CHUNK_MAX_BYTES
      )) {
        await client.hset(key, chunk);
      }
    },
    hSetOne: async (key, field, value) => {
      await client.hset(key, { [field]: value });
    },
    hGetAll: async (key) => {
      const values = await client.hgetall<Record<string, string>>(key);
      return values ?? {};
    },
    hIncrBy: async (key, field, increment) => {
      const result = await client.hincrby(key, field, increment);
      return typeof result === "number" ? result : Number(result);
    },
    get: async (key) => {
      const value = await client.get<string>(key);
      return value ?? null;
    },
    set: async (key, value, ttlSeconds) => {
      if (ttlSeconds) {
        await client.set(key, value, { ex: ttlSeconds });
      } else {
        await client.set(key, value);
      }
    },
    rename: async (oldKey, newKey) => {
      await client.rename(oldKey, newKey);
    },
    evalScript: async (script, keys, args) => {
      return client.eval(script, keys, args);
    },
    pipeline: () => {
      const p = client.pipeline();
      const builder: PipelineBuilder = {
        zadd: (key, score, member) => { p.zadd(key, { score, member }); return builder; },
        hset: (key, mapping) => { p.hset(key, mapping); return builder; },
        hincrby: (key, field, increment) => { p.hincrby(key, field, increment); return builder; },
        rename: (oldKey, newKey) => { p.rename(oldKey, newKey); return builder; },
        expire: (key, seconds) => { p.expire(key, seconds); return builder; },
        del: (...keys) => { for (const k of keys) p.del(k); return builder; },
        exec: () => p.exec(),
      };
      return builder;
    },
    del: async (...keys) => {
      if (keys.length === 0) return;
      await client.del(...keys);
    },
    expire: async (key, seconds) => {
      await client.expire(key, seconds);
    },
  };
}

async function createRedisUrlAdapter(): Promise<RedisAdapter | null> {
  const redisUrl = env.REDIS_URL;
  if (!redisUrl) return null;

  const { createClient } = await import("redis");
  const client = createClient({ url: redisUrl });
  await client.connect();

  return {
    mode: "redis-url",
    zCard: async (key) => client.zCard(key),
    zRangeRev: async (key, start, stop) =>
      client.zRange(key, start, stop, { REV: true }),
    zAddMany: async (key, entries) => {
      if (entries.length === 0) return;
      await client.zAdd(
        key,
        entries.map((entry) => ({ score: entry.score, value: entry.member }))
      );
    },
    zRemRangeByScore: async (key, min, max) => {
      const safeMin = normalizeScoreBound(min, "-inf");
      const safeMax = normalizeScoreBound(max, "+inf");
      await client.zRemRangeByScore(key, safeMin, safeMax);
    },
    hGetMany: async (key, fields) => {
      if (fields.length === 0) return [];
      const multi = client.multi();
      for (const field of fields) {
        multi.hGet(key, field);
      }
      const values = await multi.exec();
      return (values ?? []).map((value) =>
        typeof value === "string" ? value : null
      );
    },
    hSetMany: async (key, mapping) => {
      if (Object.keys(mapping).length === 0) return;
      await client.hSet(key, mapping);
    },
    hSetOne: async (key, field, value) => {
      await client.hSet(key, field, value);
    },
    hGetAll: async (key) => client.hGetAll(key),
    hIncrBy: async (key, field, increment) => {
      return client.hIncrBy(key, field, increment);
    },
    get: async (key) => {
      return (await client.get(key)) ?? null;
    },
    set: async (key, value, ttlSeconds) => {
      if (ttlSeconds) {
        await client.set(key, value, { EX: ttlSeconds });
      } else {
        await client.set(key, value);
      }
    },
    rename: async (oldKey, newKey) => {
      await client.rename(oldKey, newKey);
    },
    evalScript: async (script, keys, args) => {
      return client.eval(script, { keys, arguments: args });
    },
    pipeline: () => {
      const multi = client.multi();
      const builder: PipelineBuilder = {
        zadd: (key, score, member) => { multi.zAdd(key, { score, value: member }); return builder; },
        hset: (key, mapping) => { multi.hSet(key, mapping); return builder; },
        hincrby: (key, field, increment) => { multi.hIncrBy(key, field, increment); return builder; },
        rename: (oldKey, newKey) => { multi.rename(oldKey, newKey); return builder; },
        expire: (key, seconds) => { multi.expire(key, seconds); return builder; },
        del: (...keys) => { for (const k of keys) multi.del(k); return builder; },
        exec: () => multi.exec(),
      };
      return builder;
    },
    del: async (...keys) => {
      if (keys.length === 0) return;
      await client.del(keys);
    },
    expire: async (key, seconds) => {
      await client.expire(key, seconds);
    },
  };
}

async function createAdapter(): Promise<RedisAdapter | null> {
  try {
    const upstash = await createUpstashAdapter();
    if (upstash) return upstash;
  } catch (error) {
    console.warn("[Beacon] Failed to initialize Upstash adapter", error);
  }

  try {
    const redisUrl = await createRedisUrlAdapter();
    if (redisUrl) return redisUrl;
  } catch (error) {
    console.warn("[Beacon] Failed to initialize REDIS_URL adapter", error);
  }

  return null;
}

export async function getRedisAdapter(): Promise<RedisAdapter | null> {
  if (!adapterPromise) {
    adapterPromise = createAdapter();
  }
  return adapterPromise;
}

