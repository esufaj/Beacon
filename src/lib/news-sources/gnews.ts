import type { RawArticle } from "@/types";

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

const GNEWS_BASE_URL = "https://gnews.io/api/v4";

function getApiKey(): string {
  const key = process.env.GNEWS_KEY;
  if (!key) {
    throw new Error("GNEWS_KEY environment variable is not set");
  }
  return key;
}

function transformArticle(article: GNewsArticle): RawArticle {
  return {
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.url,
    imageUrl: article.image,
    publishedAt: article.publishedAt,
    source: article.source.name,
    author: null,
  };
}

export async function fetchHeadlines(country = "us"): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({
      country,
      max: "50",
      lang: "en",
      token: apiKey,
    });

    const response = await fetch(`${GNEWS_BASE_URL}/top-headlines?${params}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("GNews error:", error);
      return [];
    }

    const data: GNewsResponse = await response.json();
    
    return data.articles.map(transformArticle);
  } catch (error) {
    console.error("GNews fetch error:", error);
    return [];
  }
}

export async function fetchByTopic(topic: string): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    
    // GNews topics: breaking-news, world, nation, business, technology, entertainment, sports, science, health
    const topicMap: Record<string, string> = {
      politics: "nation",
      conflict: "world",
      economy: "business",
      technology: "technology",
      health: "health",
      "natural-disaster": "science",
    };
    
    const gnewsTopic = topicMap[topic] || "world";
    
    const params = new URLSearchParams({
      topic: gnewsTopic,
      max: "20",
      lang: "en",
      token: apiKey,
    });

    const response = await fetch(`${GNEWS_BASE_URL}/top-headlines?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data: GNewsResponse = await response.json();
    
    return data.articles.map(transformArticle);
  } catch (error) {
    console.error("GNews topic fetch error:", error);
    return [];
  }
}

export async function searchNews(query: string): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    
    const params = new URLSearchParams({
      q: query,
      max: "30",
      lang: "en",
      token: apiKey,
    });

    const response = await fetch(`${GNEWS_BASE_URL}/search?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data: GNewsResponse = await response.json();
    
    return data.articles.map(transformArticle);
  } catch (error) {
    console.error("GNews search error:", error);
    return [];
  }
}

export const gnewsSource = {
  name: "GNews",
  fetchHeadlines: () => fetchHeadlines(),
  fetchByCategory: fetchByTopic,
};




