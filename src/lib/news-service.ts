import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import type { BiasRating, Category, NewsArticle, Sentiment, Urgency } from "@/types";
import { batchGeocode, getRegionForCountry } from "./geocoding";
import { supabase, type DbArticle } from "./supabase";
import { sanitizeLocationString } from "@/lib/location-utils";
import { formatSourceName } from "@/lib/source-utils";
import {
  clearCachedWindow,
  getCachedPage,
  getMemoryCacheAgeMs,
  setCachedWindow,
  type CacheLayer,
  upsertCachedArticle,
} from "@/lib/cache/article-cache";

const CATEGORY_MAP: Record<string, Category> = {
  Politics: "politics",
  Business: "economy",
  Technology: "technology",
  Science: "science",
  Health: "health",
  Sports: "sports",
  Entertainment: "entertainment",
  World: "conflict",
  Crime: "crime",
  Environment: "environment",
  Education: "education",
  Other: "politics",
};

const DB_BATCH_SIZE = 500;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_HOURS_BACK = 24;

let lastCacheAgeMs = 0;
let lastIsStale = false;
const windowRebuilds = new Map<
  number,
  Promise<{ articles: NewsArticle[]; cacheLayer: CacheLayer }>
>();

function formatSupabaseError(error: PostgrestError): string {
  const parts: string[] = [];
  if (error.message) parts.push(error.message);
  if (error.code) parts.push(`[code: ${error.code}]`);
  if (error.details) parts.push(`[details: ${error.details}]`);
  if (error.hint) parts.push(`[hint: ${error.hint}]`);
  return parts.length > 0 ? parts.join(" ") : "Unknown error";
}

function mapCategory(aiCategory: string | null): Category {
  if (!aiCategory) return "politics";
  return CATEGORY_MAP[aiCategory] || "politics";
}

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export interface FetchOptions {
  limit?: number;
  offset?: number;
  hoursBack?: number;
}

export interface NewsPageOptions {
  offset?: number;
  limit?: number;
  hoursBack?: number;
  forceRefresh?: boolean;
}

export interface NewsPageResult {
  articles: NewsArticle[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number | null;
  cacheLayer: CacheLayer;
  isStale: boolean;
  cacheAgeMs: number;
  maxPublishedAt: string | null;
}

async function loadRawArticlesPageFromDb({
  offset,
  limit,
  hoursBack,
}: Required<FetchOptions>): Promise<{ data: DbArticle[]; totalCount: number }> {
  if (!supabase) {
    return { data: [], totalCount: 0 };
  }

  const cutoffDate = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000
  ).toISOString();

  const { data, count, error } = await supabase
    .from("articles")
    .select(
      `
      *,
      rss_sources (name, bias_rating, category)
    `,
      { count: "exact" }
    )
    .eq("ai_processed", true)
    .gte("published_at", cutoffDate)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return { data: (data ?? []) as DbArticle[], totalCount: count ?? 0 };
}

async function loadRawArticlesWindowFromDb(hoursBack: number): Promise<DbArticle[]> {
  if (!supabase) return [];

  const result: DbArticle[] = [];
  let offset = 0;

  while (true) {
    const { data } = await loadRawArticlesPageFromDb({
      offset,
      limit: DB_BATCH_SIZE,
      hoursBack,
    });
    result.push(...data);
    if (data.length < DB_BATCH_SIZE) break;
    offset += DB_BATCH_SIZE;
  }

  return result;
}

async function processDbArticles(articles: DbArticle[]): Promise<NewsArticle[]> {
  if (articles.length === 0) return [];

  const uniqueLocations = [
    ...new Set(
      articles
        .map((article) => sanitizeLocationString(article.location))
        .filter((location): location is string => Boolean(location))
    ),
  ];

  const cachedLocationsMap = new Map<
    string,
    { name: string | null; lat: number | null; lng: number | null; country: string | null; region: string | null }
  >();

  if (supabase && uniqueLocations.length > 0) {
    const { data: cachedLocations } = await supabase
      .from("location_cache")
      .select("location, name, lat, lng, country, region")
      .in("location", uniqueLocations);

    for (const entry of cachedLocations ?? []) {
      cachedLocationsMap.set(entry.location, entry);
    }
  }

  const geocodedMap = batchGeocode(
    uniqueLocations.filter((location) => !cachedLocationsMap.has(location))
  );

  const processed = articles.map((article) => {
    const cleanedLocation = sanitizeLocationString(article.location);
    const cachedLocation = cleanedLocation
      ? cachedLocationsMap.get(cleanedLocation)
      : null;
    const geocodedLocation = cleanedLocation
      ? geocodedMap.get(cleanedLocation)
      : null;

    const country =
      cachedLocation?.country || geocodedLocation?.country || "Unknown";
    const region =
      cachedLocation?.region ||
      geocodedLocation?.region ||
      (country !== "Unknown" ? getRegionForCountry(country) : null) ||
      "Unknown";

    return {
      id: article.id,
      headline: stripHtml(article.title),
      summary: stripHtml(
        article.summary || article.description || article.content?.slice(0, 300) || null
      ),
      content: stripHtml(article.content || article.description || null),
      location: {
        name:
          cachedLocation?.name ||
          cleanedLocation ||
          geocodedLocation?.name ||
          "Unknown",
        lat: cachedLocation?.lat ?? geocodedLocation?.lat ?? 0,
        lng: cachedLocation?.lng ?? geocodedLocation?.lng ?? 0,
        country,
        region,
      },
      category: mapCategory(article.category),
      timestamp: article.published_at
        ? new Date(article.published_at)
        : new Date(article.created_at),
      source: formatSourceName(
        article.source_name || article.rss_sources?.name,
        article.source_type,
        article.article_url
      ),
      imageUrl: article.image_url || undefined,
      url: article.article_url,
      credibilityScore: article.credibility_score || undefined,
      biasRating: (article.bias_rating as BiasRating) || undefined,
      sentiment: (article.sentiment as Sentiment) || undefined,
      urgency: (article.urgency as Urgency) || undefined,
      readingTime: article.reading_time || undefined,
      wordCount: article.word_count || undefined,
      keywords: article.keywords || undefined,
      entitiesPeople: article.entities_people || undefined,
      entitiesOrganizations: article.entities_organizations || undefined,
      entitiesLocations: article.entities_locations || undefined,
      articleType: article.article_type || undefined,
      targetAudience: article.target_audience || undefined,
    } satisfies NewsArticle;
  });

  return processed.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

async function loadAndCacheWindow(hoursBack: number): Promise<{
  articles: NewsArticle[];
  cacheLayer: CacheLayer;
}> {
  const raw = await loadRawArticlesWindowFromDb(hoursBack);
  const articles = await processDbArticles(raw);
  const cacheLayer = await setCachedWindow(articles);
  return { articles, cacheLayer };
}

function getOrStartWindowRebuild(hoursBack: number): Promise<{
  articles: NewsArticle[];
  cacheLayer: CacheLayer;
}> {
  const existing = windowRebuilds.get(hoursBack);
  if (existing) return existing;

  const rebuild = (async () => {
    await clearCachedWindow();
    return loadAndCacheWindow(hoursBack);
  })().finally(() => {
    windowRebuilds.delete(hoursBack);
  });

  windowRebuilds.set(hoursBack, rebuild);
  return rebuild;
}

/**
 * Loading lifecycle:
 * 1) Try Redis (or memory fallback) for an offset/limit page in the 24h window.
 * 2) On cache miss/stale force-refresh, rebuild the 24h cache from Supabase.
 * 3) Always return deterministic `published_at DESC` pages with metadata for
 *    progressive background loading and realtime cursor gating.
 */
export async function getNewsPage(
  options: NewsPageOptions = {}
): Promise<NewsPageResult> {
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(1, Math.min(200, options.limit ?? DEFAULT_PAGE_SIZE));
  const hoursBack = Math.max(1, options.hoursBack ?? DEFAULT_HOURS_BACK);
  const forceRefresh = options.forceRefresh ?? false;

  if (forceRefresh) {
    await clearCachedWindow();
  }

  const cachedPage = await getCachedPage(offset, limit);
  const canUseCache = cachedPage.cacheHit && !forceRefresh;
  const cacheLooksCorrupt =
    cachedPage.totalCount > 0 && cachedPage.articles.length === 0;

  if (
    canUseCache &&
    !cacheLooksCorrupt &&
    (!cachedPage.isStale || cachedPage.totalCount > 0)
  ) {
    lastCacheAgeMs = cachedPage.cacheAgeMs;
    lastIsStale = cachedPage.isStale;
    return {
      articles: cachedPage.articles,
      totalCount: cachedPage.totalCount,
      hasMore: offset + limit < cachedPage.totalCount,
      nextOffset:
        offset + limit < cachedPage.totalCount ? offset + limit : null,
      cacheLayer: cachedPage.cacheLayer,
      isStale: cachedPage.isStale,
      cacheAgeMs: cachedPage.cacheAgeMs,
      maxPublishedAt: cachedPage.maxPublishedAt,
    };
  }

  if (cacheLooksCorrupt && !windowRebuilds.has(hoursBack)) {
    console.warn("[Beacon] Cache looked corrupt, rebuilding from DB window");
  }

  try {
    const { articles, cacheLayer } = await getOrStartWindowRebuild(hoursBack);
    const page = articles.slice(offset, offset + limit);
    lastCacheAgeMs = getMemoryCacheAgeMs();
    lastIsStale = false;
    return {
      articles: page,
      totalCount: articles.length,
      hasMore: offset + limit < articles.length,
      nextOffset: offset + limit < articles.length ? offset + limit : null,
      cacheLayer: cacheLayer === "memory" ? "db" : cacheLayer,
      isStale: false,
      cacheAgeMs: lastCacheAgeMs,
      maxPublishedAt: articles[0]?.timestamp.toISOString() ?? null,
    };
  } catch (error) {
    console.error("[Beacon] Failed loading DB window, returning cache fallback", error);
    lastCacheAgeMs = cachedPage.cacheAgeMs;
    lastIsStale = true;
    return {
      articles: cachedPage.articles,
      totalCount: cachedPage.totalCount,
      hasMore: offset + limit < cachedPage.totalCount,
      nextOffset:
        offset + limit < cachedPage.totalCount ? offset + limit : null,
      cacheLayer: cachedPage.cacheLayer,
      isStale: true,
      cacheAgeMs: cachedPage.cacheAgeMs,
      maxPublishedAt: cachedPage.maxPublishedAt,
    };
  }
}

export async function fetchAndProcessNews(
  options: FetchOptions = {}
): Promise<NewsArticle[]> {
  const page = await getNewsPage({
    offset: options.offset,
    limit: options.limit,
    hoursBack: options.hoursBack,
  });
  return page.articles;
}

export async function getCachedNews(forceRefresh = false): Promise<NewsArticle[]> {
  const page = await getNewsPage({
    offset: 0,
    limit: DEFAULT_PAGE_SIZE,
    hoursBack: DEFAULT_HOURS_BACK,
    forceRefresh,
  });
  return page.articles;
}

export function getCacheAge(): number {
  return lastCacheAgeMs;
}

export function isCacheStale(): boolean {
  return lastIsStale;
}

export async function syncArticleIntoCache(articleId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        rss_sources (name, bias_rating, category)
      `
      )
      .eq("id", articleId)
      .eq("ai_processed", true)
      .maybeSingle();

    if (error || !data) return false;
    const [processed] = await processDbArticles([data as DbArticle]);
    if (!processed) return false;
    await upsertCachedArticle(processed);
    return true;
  } catch (error) {
    console.warn("[Beacon] Failed syncing article into cache", error);
    return false;
  }
}

export async function getArticleCount(): Promise<number> {
  if (!supabase) return 0;
  
  const { count, error } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("ai_processed", true);
  
  if (error) {
    console.error("[Beacon] Error getting article count:", formatSupabaseError(error));
    return 0;
  }
  
  return count || 0;
}

export async function getSourceStats(): Promise<{ total: number; withErrors: number; lastSync: Date | null }> {
  if (!supabase) return { total: 0, withErrors: 0, lastSync: null };
  
  const { data: sources, error } = await supabase
    .from("rss_sources")
    .select("last_fetched_at, fetch_error")
    .eq("is_active", true);
  
  if (error || !sources) {
    return { total: 0, withErrors: 0, lastSync: null };
  }
  
  const withErrors = sources.filter(s => s.fetch_error !== null).length;
  const lastFetched = sources
    .map(s => s.last_fetched_at)
    .filter(Boolean)
    .sort()
    .pop();
  
  return {
    total: sources.length,
    withErrors,
    lastSync: lastFetched ? new Date(lastFetched) : null,
  };
}

export async function triggerManualSync(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-rss-feeds`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return {
      success: true,
      message: `Fetched ${data.articles_fetched} articles, ${data.articles_new} new`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export interface RssSource {
  id: number;
  name: string;
  category: string | null;
  bias_rating: string | null;
}

export async function getAllSources(): Promise<RssSource[]> {
  // Return empty array during SSR or when Supabase is not configured
  if (!supabase) {
    return [];
  }

  // Additional check for client-side only execution
  if (typeof window === "undefined") {
    return [];
  }
  
  try {
    const { data: sources, error } = await supabase
      .from("rss_sources")
      .select("id, name, category, bias_rating")
      .eq("is_active", true)
      .order("name");
    
    if (error) {
      // Only log in development to avoid noise in production
      if (process.env.NODE_ENV === "development") {
        console.warn("[Beacon] Error fetching sources:", formatSupabaseError(error));
      }
      return [];
    }
    
    return sources ?? [];
  } catch (err) {
    // Catch any unexpected errors (network issues, etc.)
    if (process.env.NODE_ENV === "development") {
      console.warn("[Beacon] Unexpected error fetching sources:", err instanceof Error ? err.message : "Unknown error");
    }
    return [];
  }
}
