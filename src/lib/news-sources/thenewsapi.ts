import type { RawArticle } from "@/types";

interface TheNewsAPIArticle {
  uuid: string;
  title: string;
  description: string;
  keywords: string;
  snippet: string;
  url: string;
  image_url: string | null;
  language: string;
  published_at: string;
  source: string;
  categories: string[];
  relevance_score: number | null;
}

interface TheNewsAPIResponse {
  meta: {
    found: number;
    returned: number;
    limit: number;
    page: number;
  };
  data: TheNewsAPIArticle[];
}

const THENEWSAPI_BASE_URL = "https://api.thenewsapi.com/v1/news";

function getApiKey(): string {
  const key = process.env.THENEWSAPI_KEY;
  if (!key) {
    throw new Error("THENEWSAPI_KEY environment variable is not set");
  }
  return key;
}

function transformArticle(article: TheNewsAPIArticle): RawArticle {
  return {
    title: article.title,
    description: article.description,
    content: article.snippet,
    url: article.url,
    imageUrl: article.image_url,
    publishedAt: article.published_at,
    source: article.source,
    author: null,
    locationHint: extractLocationFromKeywords(article.keywords),
  };
}

function extractLocationFromKeywords(keywords: string): string | undefined {
  if (!keywords) return undefined;
  
  // Common location patterns in keywords
  const locationKeywords = keywords.split(",").map((k) => k.trim());
  
  // Look for country/city names
  const locationPatterns = [
    /^(United States|UK|China|Russia|India|Japan|Germany|France|Brazil|Canada)$/i,
    /^(New York|London|Paris|Tokyo|Beijing|Moscow|Berlin|Sydney|Dubai)$/i,
    /^(Washington|Los Angeles|Chicago|Houston|Miami|Toronto|Vancouver)$/i,
  ];
  
  for (const keyword of locationKeywords) {
    for (const pattern of locationPatterns) {
      if (pattern.test(keyword)) {
        return keyword;
      }
    }
  }
  
  return undefined;
}

export async function fetchTopStories(): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({
      api_token: apiKey,
      language: "en",
      limit: "50",
    });

    const response = await fetch(`${THENEWSAPI_BASE_URL}/top?${params}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("TheNewsAPI error:", error);
      return [];
    }

    const data: TheNewsAPIResponse = await response.json();
    
    return data.data.map(transformArticle);
  } catch (error) {
    console.error("TheNewsAPI fetch error:", error);
    return [];
  }
}

export async function fetchByCategories(
  categories: string[]
): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    
    // TheNewsAPI categories: general, science, sports, business, health, entertainment, tech, politics, food, travel
    const categoryMap: Record<string, string> = {
      politics: "politics",
      conflict: "general",
      economy: "business",
      technology: "tech",
      health: "health",
      "natural-disaster": "science",
    };
    
    const mappedCategories = categories
      .map((c) => categoryMap[c] || "general")
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .join(",");
    
    const params = new URLSearchParams({
      api_token: apiKey,
      categories: mappedCategories,
      language: "en",
      limit: "30",
    });

    const response = await fetch(`${THENEWSAPI_BASE_URL}/top?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data: TheNewsAPIResponse = await response.json();
    
    return data.data.map(transformArticle);
  } catch (error) {
    console.error("TheNewsAPI categories fetch error:", error);
    return [];
  }
}

export async function searchNews(query: string): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    
    const params = new URLSearchParams({
      api_token: apiKey,
      search: query,
      language: "en",
      limit: "30",
    });

    const response = await fetch(`${THENEWSAPI_BASE_URL}/all?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data: TheNewsAPIResponse = await response.json();
    
    return data.data.map(transformArticle);
  } catch (error) {
    console.error("TheNewsAPI search error:", error);
    return [];
  }
}

export const theNewsAPISource = {
  name: "TheNewsAPI",
  fetchHeadlines: fetchTopStories,
  fetchByCategory: (category: string) => fetchByCategories([category]),
};




