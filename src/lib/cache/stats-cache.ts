import "server-only";

import { getRedisAdapter } from "./redis-client";

const META_KEY = "news:articles:24h:meta";
const SOURCE_STATS_KEY = "news:meta:source_stats";
const SOURCE_STATS_TTL = 600;

export async function getArticleCountFromRedis(): Promise<number> {
  const adapter = await getRedisAdapter();
  if (!adapter) return 0;

  try {
    const results = await adapter.hGetMany(META_KEY, ["totalCount"]);
    return Number(results[0] ?? 0);
  } catch {
    return 0;
  }
}

export interface SourceStats {
  total: number;
  withErrors: number;
  lastSync: string | null;
}

export async function getSourceStatsFromRedis(
  supabaseFallback?: () => Promise<SourceStats>
): Promise<SourceStats> {
  const adapter = await getRedisAdapter();
  const empty: SourceStats = { total: 0, withErrors: 0, lastSync: null };

  if (adapter) {
    try {
      const cached = await adapter.get(SOURCE_STATS_KEY);
      if (cached) {
        return JSON.parse(cached) as SourceStats;
      }
    } catch {
      // fall through to Supabase
    }
  }

  if (!supabaseFallback) return empty;

  try {
    const stats = await supabaseFallback();
    if (adapter) {
      await adapter.set(SOURCE_STATS_KEY, JSON.stringify(stats), SOURCE_STATS_TTL).catch(() => {});
    }
    return stats;
  } catch {
    return empty;
  }
}

export async function invalidateSourceStats(): Promise<void> {
  const adapter = await getRedisAdapter();
  if (!adapter) return;
  try {
    await adapter.del(SOURCE_STATS_KEY);
  } catch {
    // best-effort
  }
}
