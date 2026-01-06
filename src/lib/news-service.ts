import type { NewsArticle, RawArticle, Category } from "@/types";
import { newsAPISource } from "./news-sources/newsapi";
import { gnewsSource } from "./news-sources/gnews";
import { theNewsAPISource } from "./news-sources/thenewsapi";
import { mediaStackSource } from "./news-sources/mediastack";
import { extractLocation } from "./location-extractor";
import { geocode, type GeocodingResult } from "./geocoding";

interface ProcessedArticle extends Omit<NewsArticle, "timestamp"> {
  timestamp: Date;
  rawSource: string;
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  politics: [
    "election", "vote", "president", "minister", "parliament", "congress",
    "senate", "government", "policy", "legislation", "law", "political",
    "democrat", "republican", "party", "campaign", "ballot", "diplomat",
  ],
  conflict: [
    "war", "military", "attack", "bomb", "missile", "soldier", "army",
    "troops", "fighting", "battle", "conflict", "strike", "killed",
    "violence", "terrorist", "terrorism", "weapon", "nuclear", "invasion",
  ],
  "natural-disaster": [
    "earthquake", "hurricane", "tornado", "flood", "wildfire", "tsunami",
    "volcano", "storm", "disaster", "emergency", "evacuation", "cyclone",
    "drought", "landslide", "blizzard", "heatwave", "climate",
  ],
  economy: [
    "stock", "market", "economy", "trade", "business", "finance", "bank",
    "inflation", "recession", "gdp", "unemployment", "investment", "crypto",
    "bitcoin", "dollar", "euro", "tariff", "tax", "budget", "debt",
  ],
  technology: [
    "tech", "ai", "artificial intelligence", "robot", "software", "hardware",
    "app", "startup", "silicon valley", "cyber", "hack", "data", "digital",
    "internet", "smartphone", "computer", "algorithm", "machine learning",
  ],
  health: [
    "health", "medical", "hospital", "doctor", "patient", "disease", "virus",
    "vaccine", "covid", "pandemic", "outbreak", "treatment", "drug", "cancer",
    "mental health", "healthcare", "surgery", "medicine", "pharmaceutical",
  ],
};

function categorizeArticle(article: RawArticle): Category {
  const text = `${article.title} ${article.description || ""} ${article.content || ""}`.toLowerCase();
  
  let bestCategory: Category = "politics";
  let bestScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as Category;
    }
  }
  
  return bestCategory;
}

function generateArticleId(article: RawArticle): string {
  const titleClean = article.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  let hash = 0;
  for (let i = 0; i < titleClean.length; i++) {
    const char = titleClean.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const titlePrefix = titleClean.slice(0, 15);
  const timestamp = new Date(article.publishedAt).getTime();
  return `${titlePrefix}${Math.abs(hash).toString(36)}-${timestamp}`;
}

function deduplicateArticles(articles: RawArticle[]): RawArticle[] {
  const seen = new Map<string, RawArticle>();
  
  for (const article of articles) {
    // Create a fingerprint from title
    const fingerprint = article.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 5)
      .sort()
      .join("");
    
    const existing = seen.get(fingerprint);
    if (!existing) {
      seen.set(fingerprint, article);
    } else {
      // Keep the one with more content
      const existingLen = (existing.description?.length || 0) + (existing.content?.length || 0);
      const newLen = (article.description?.length || 0) + (article.content?.length || 0);
      if (newLen > existingLen) {
        seen.set(fingerprint, article);
      }
    }
  }
  
  return Array.from(seen.values());
}

async function processArticle(
  article: RawArticle,
  geocodingResult: GeocodingResult | null
): Promise<ProcessedArticle | null> {
  if (!geocodingResult) {
    return null;
  }
  
  return {
    id: generateArticleId(article),
    headline: article.title,
    summary: article.description || article.content?.slice(0, 200) || "",
    content: article.content || article.description || "",
    location: {
      name: geocodingResult.name,
      lat: geocodingResult.lat,
      lng: geocodingResult.lng,
      country: geocodingResult.country,
      region: geocodingResult.region,
    },
    category: categorizeArticle(article),
    timestamp: new Date(article.publishedAt),
    source: article.source,
    imageUrl: article.imageUrl || undefined,
    url: article.url,
    rawSource: article.source,
  };
}

export async function fetchAndProcessNews(): Promise<NewsArticle[]> {
  const allRawArticles: RawArticle[] = [];
  const errors: string[] = [];
  const sourceCounts: Record<string, number> = {};

  console.log("[Beacon] Fetching news from all sources...");

  // Fetch from all sources in parallel
  const sourceResults = await Promise.allSettled([
    newsAPISource.fetchHeadlines().catch((e) => {
      errors.push(`NewsAPI: ${e.message}`);
      return [];
    }),
    gnewsSource.fetchHeadlines().catch((e) => {
      errors.push(`GNews: ${e.message}`);
      return [];
    }),
    theNewsAPISource.fetchHeadlines().catch((e) => {
      errors.push(`TheNewsAPI: ${e.message}`);
      return [];
    }),
    mediaStackSource.fetchHeadlines().catch((e) => {
      errors.push(`MediaStack: ${e.message}`);
      return [];
    }),
  ]);

  const sourceNames = ["NewsAPI", "GNews", "TheNewsAPI", "MediaStack"];
  
  for (let i = 0; i < sourceResults.length; i++) {
    const result = sourceResults[i];
    const sourceName = sourceNames[i];
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      sourceCounts[sourceName] = result.value.length;
      allRawArticles.push(...result.value);
    } else {
      sourceCounts[sourceName] = 0;
    }
  }

  console.log("[Beacon] Articles fetched per source:", sourceCounts);

  if (errors.length > 0) {
    console.warn("[Beacon] Some news sources had errors:", errors);
  }

  if (allRawArticles.length === 0) {
    console.warn("[Beacon] No articles fetched from any source");
    return [];
  }

  // Sort raw articles by publish date (newest first) before deduplication
  allRawArticles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Log the newest article timestamp
  if (allRawArticles.length > 0) {
    const newestArticle = allRawArticles[0];
    const ageMinutes = Math.round(
      (Date.now() - new Date(newestArticle.publishedAt).getTime()) / 60000
    );
    console.log(`[Beacon] Newest article: "${newestArticle.title.slice(0, 50)}..." (${ageMinutes} min ago)`);
  }

  // Deduplicate
  const uniqueArticles = deduplicateArticles(allRawArticles);
  console.log(`[Beacon] After deduplication: ${uniqueArticles.length} unique articles`);
  
  // Extract locations and geocode
  const processedArticles: NewsArticle[] = [];
  
  for (const article of uniqueArticles) {
    const extractedLocation = extractLocation(article);
    
    if (extractedLocation) {
      const geocodingResult = await geocode(extractedLocation.text);
      const processed = await processArticle(article, geocodingResult);
      
      if (processed) {
        processedArticles.push(processed);
      }
    }
  }

  console.log(`[Beacon] Processed ${processedArticles.length} articles with valid locations`);

  // Deduplicate by ID to prevent React key conflicts
  const uniqueById = new Map<string, NewsArticle>();
  for (const article of processedArticles) {
    if (!uniqueById.has(article.id)) {
      uniqueById.set(article.id, article);
    }
  }
  const finalArticles = Array.from(uniqueById.values());

  // Sort by timestamp (newest first)
  finalArticles.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  console.log(`[Beacon] Final count after ID deduplication: ${finalArticles.length} articles`);

  return finalArticles;
}

export async function fetchNewsByCategory(category: Category): Promise<NewsArticle[]> {
  const allRawArticles: RawArticle[] = [];

  const sourceResults = await Promise.allSettled([
    newsAPISource.fetchByCategory?.(category).catch(() => []) || Promise.resolve([]),
    gnewsSource.fetchByCategory?.(category).catch(() => []) || Promise.resolve([]),
    theNewsAPISource.fetchByCategory?.(category).catch(() => []) || Promise.resolve([]),
  ]);

  for (const result of sourceResults) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      allRawArticles.push(...result.value);
    }
  }

  const uniqueArticles = deduplicateArticles(allRawArticles);
  const processedArticles: NewsArticle[] = [];

  for (const article of uniqueArticles) {
    const extractedLocation = extractLocation(article);
    
    if (extractedLocation) {
      const geocodingResult = await geocode(extractedLocation.text);
      const processed = await processArticle(article, geocodingResult);
      
      if (processed) {
        // Override category to the requested one
        processed.category = category;
        processedArticles.push(processed);
      }
    }
  }

  processedArticles.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return processedArticles;
}

// In-memory cache for news
let cachedNews: NewsArticle[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes for fresher news

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
    return cachedNews; // Return stale cache on error
  }
}

export function getCacheAge(): number {
  return Date.now() - cacheTimestamp;
}

export function isCacheStale(): boolean {
  return Date.now() - cacheTimestamp > CACHE_DURATION_MS;
}

