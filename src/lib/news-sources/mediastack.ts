import type { RawArticle } from "@/types";

interface MediaStackArticle {
  author: string | null;
  title: string;
  description: string;
  url: string;
  source: string;
  image: string | null;
  category: string;
  language: string;
  country: string;
  published_at: string;
}

interface MediaStackResponse {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: MediaStackArticle[];
}

const MEDIASTACK_BASE_URL = "http://api.mediastack.com/v1";

function getApiKey(): string {
  const key = process.env.MEDIASTACK_KEY;
  if (!key) {
    throw new Error("MEDIASTACK_KEY environment variable is not set");
  }
  return key;
}

function transformArticle(article: MediaStackArticle): RawArticle {
  return {
    title: article.title,
    description: article.description,
    content: article.description,
    url: article.url,
    imageUrl: article.image,
    publishedAt: article.published_at,
    source: article.source,
    author: article.author,
    locationHint: article.country?.toUpperCase(),
  };
}

export async function fetchLiveNews(): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    const params = new URLSearchParams({
      access_key: apiKey,
      languages: "en",
      sort: "published_desc",
      limit: "50",
    });

    const response = await fetch(`${MEDIASTACK_BASE_URL}/news?${params}`);

    if (!response.ok) {
      const error = await response.text();
      console.error("MediaStack error:", error);
      return [];
    }

    const data: MediaStackResponse = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      console.error("MediaStack returned unexpected data format");
      return [];
    }

    return data.data
      .filter((a) => a.title && a.title.length > 0)
      .map(transformArticle);
  } catch (error) {
    console.error("MediaStack fetch error:", error);
    return [];
  }
}

export async function fetchByCategory(category: string): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();

    const categoryMap: Record<string, string> = {
      politics: "politics",
      conflict: "general",
      economy: "business",
      technology: "technology",
      health: "health",
      "natural-disaster": "science",
    };

    const mediaStackCategory = categoryMap[category] || "general";

    const params = new URLSearchParams({
      access_key: apiKey,
      categories: mediaStackCategory,
      languages: "en",
      sort: "published_desc",
      limit: "25",
    });

    const response = await fetch(`${MEDIASTACK_BASE_URL}/news?${params}`);

    if (!response.ok) {
      return [];
    }

    const data: MediaStackResponse = await response.json();

    if (!data.data) {
      return [];
    }

    return data.data
      .filter((a) => a.title && a.title.length > 0)
      .map(transformArticle);
  } catch (error) {
    console.error("MediaStack category fetch error:", error);
    return [];
  }
}

export const mediaStackSource = {
  name: "MediaStack",
  fetchHeadlines: fetchLiveNews,
  fetchByCategory,
};




