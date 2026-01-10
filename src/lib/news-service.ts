import type { NewsArticle, Category } from "@/types";
import { supabase, type DbArticle } from "./supabase";
import { geocode } from "./geocoding";

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

async function getLocationCoords(locationStr: string | null): Promise<{ lat: number; lng: number; name: string; country: string; region: string } | null> {
  if (!locationStr || locationStr === "unknown") return null;
  
  const cached = locationCache.get(locationStr);
  if (cached) return cached;
  
  const result = await geocode(locationStr);
  if (result) {
    const loc = { lat: result.lat, lng: result.lng, name: result.name, country: result.country, region: result.region };
    locationCache.set(locationStr, loc);
    return loc;
  }
  return null;
}

const locationCache = new Map<string, { lat: number; lng: number; name: string; country: string; region: string }>();

export async function fetchAndProcessNews(): Promise<NewsArticle[]> {
  if (!supabase) {
    console.error("[Beacon] Supabase client not initialized");
    return [];
  }

  console.log("[Beacon] Fetching articles from Supabase...");
  
  const { data: articles, error } = await supabase
    .from("articles")
    .select(`
      *,
      rss_sources (name, bias_rating, category)
    `)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(100);
  
  if (error) {
    console.error("[Beacon] Error fetching articles:", error);
    return [];
  }
  
  if (!articles || articles.length === 0) {
    console.warn("[Beacon] No articles found in database");
    return [];
  }
  
  console.log(`[Beacon] Found ${articles.length} articles, processing...`);
  
  const processedArticles: NewsArticle[] = [];
  
  for (const article of articles as DbArticle[]) {
    const locationCoords = await getLocationCoords(article.location);
    
    const defaultLocation = {
      name: article.location || "Unknown",
      lat: locationCoords?.lat || 0,
      lng: locationCoords?.lng || 0,
      country: locationCoords?.country || "Unknown",
      region: locationCoords?.region || "Unknown",
    };

    processedArticles.push({
      id: article.id,
      headline: article.title,
      summary: article.summary || article.description || article.content?.slice(0, 200) || "",
      content: article.content || article.description || "",
      location: defaultLocation,
      category: mapCategory(article.category),
      timestamp: article.published_at ? new Date(article.published_at) : new Date(article.created_at),
      source: article.rss_sources?.name || "Unknown",
      imageUrl: article.image_url || undefined,
      url: article.article_url,
    });
  }
  
  console.log(`[Beacon] Processed ${processedArticles.length} articles`);
  
  processedArticles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
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
    .select("*", { count: "exact", head: true });
  
  if (error) {
    console.error("[Beacon] Error getting article count:", error);
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
