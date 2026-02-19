import type { NewsArticle, Category, BiasRating, Sentiment, Urgency } from "@/types";
import { supabase, type DbArticle } from "./supabase";
import { batchGeocode, getRegionForCountry } from "./geocoding";
import { sanitizeLocationString } from "@/lib/location-utils";
import { formatSourceName } from "@/lib/source-utils";
import type { PostgrestError } from "@supabase/supabase-js";

// Helper to format Supabase/Postgrest errors for logging
function formatSupabaseError(error: PostgrestError): string {
  const parts: string[] = [];
  if (error.message) parts.push(error.message);
  if (error.code) parts.push(`[code: ${error.code}]`);
  if (error.details) parts.push(`[details: ${error.details}]`);
  if (error.hint) parts.push(`[hint: ${error.hint}]`);
  return parts.length > 0 ? parts.join(" ") : "Unknown error";
}

// Check if we're in a browser environment with Supabase available
function isSupabaseReady(): boolean {
  return typeof window !== "undefined" && supabase !== null;
}

const CATEGORY_MAP: Record<string, Category> = {
  "Politics": "politics",
  "Business": "economy",
  "Technology": "technology",
  "Science": "technology",
  "Health": "health",
  "Sports": "politics",
  "Entertainment": "politics",
  "World": "conflict",
  "Crime": "conflict",
  "Environment": "natural-disaster",
  "Education": "politics",
  "Other": "politics",
};

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

export async function fetchAndProcessNews(options: FetchOptions = {}): Promise<NewsArticle[]> {
  if (!supabase) {
    console.error("[Beacon] Supabase client not initialized");
    return [];
  }

  const { limit = 50, offset = 0, hoursBack = 48 } = options;
  const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  console.log(`[Beacon] Fetching articles from last ${hoursBack} hours...`);
  
  const { data: articles, error } = await supabase
    .from("articles")
    .select(`
      *,
      rss_sources (name, bias_rating, category)
    `)
    .eq("ai_processed", true)
    .gte("published_at", cutoffDate)
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error("[Beacon] Error fetching articles:", formatSupabaseError(error));
    return [];
  }
  
  if (!articles || articles.length === 0) {
    console.warn("[Beacon] No articles found in database");
    return [];
  }
  
  console.log(`[Beacon] Found ${articles.length} articles, processing...`);
  
  const uniqueLocations = [...new Set(
    (articles as DbArticle[])
      .map(a => sanitizeLocationString(a.location))
      .filter((loc): loc is string => !!loc)
  )];

  const { data: cachedLocations } = await supabase
    .from("location_cache")
    .select("location, name, lat, lng, country, region")
    .in("location", uniqueLocations);

  const cachedMap = new Map(
    (cachedLocations ?? []).map((entry) => [entry.location, entry])
  );

  const locationMap = batchGeocode(
    uniqueLocations.filter((loc) => !cachedMap.has(loc))
  );
  
  const processedArticles: NewsArticle[] = [];
  
  for (const article of articles as DbArticle[]) {
    const cleanedLocation = sanitizeLocationString(article.location);
    const cachedLocation = cleanedLocation ? cachedMap.get(cleanedLocation) : null;
    const locationResult = cleanedLocation ? locationMap.get(cleanedLocation) : null;
    
    const country =
      cachedLocation?.country || locationResult?.country || "Unknown";
    const region =
      cachedLocation?.region ||
      locationResult?.region ||
      (country !== "Unknown" ? getRegionForCountry(country) : null) ||
      "Unknown";
    const location = {
      name:
        cachedLocation?.name ||
        cleanedLocation ||
        locationResult?.name ||
        "Unknown",
      lat: cachedLocation?.lat ?? locationResult?.lat ?? 0,
      lng: cachedLocation?.lng ?? locationResult?.lng ?? 0,
      country,
      region,
    };

    const summary = stripHtml(article.summary || article.description || article.content?.slice(0, 300) || null);
    const content = stripHtml(article.content || article.description || null);

    processedArticles.push({
      id: article.id,
      headline: stripHtml(article.title),
      summary,
      content,
      location,
      category: mapCategory(article.category),
      timestamp: article.published_at ? new Date(article.published_at) : new Date(article.created_at),
      source: formatSourceName(
        article.source_name || article.rss_sources?.name,
        article.source_type,
        article.article_url
      ),
      imageUrl: article.image_url || undefined,
      url: article.article_url,
      // AI metadata
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
    });
  }
  
  console.log(`[Beacon] Processed ${processedArticles.length} articles`);
  
  return processedArticles;
}

let cachedNews: NewsArticle[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 2 * 60 * 1000;

export async function getCachedNews(forceRefresh = false): Promise<NewsArticle[]> {
  const now = Date.now();
  
  if (!forceRefresh && cachedNews.length > 0 && now - cacheTimestamp < CACHE_DURATION_MS) {
    return cachedNews;
  }
  
  try {
    const news = await fetchAndProcessNews();
    if (news.length > 0) {
      cachedNews = news;
      cacheTimestamp = now;
    }
    return cachedNews;
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return cachedNews;
  }
}

export function getCacheAge(): number {
  return Date.now() - cacheTimestamp;
}

export function isCacheStale(): boolean {
  return Date.now() - cacheTimestamp > CACHE_DURATION_MS;
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
