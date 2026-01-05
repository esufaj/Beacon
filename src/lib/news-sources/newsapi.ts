import type { RawArticle } from "@/types";

interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

const NEWSAPI_BASE_URL = "https://newsapi.org/v2";

function getApiKey(): string {
  const key = process.env.NEWSAPI_KEY;
  if (!key) {
    throw new Error("NEWSAPI_KEY environment variable is not set");
  }
  return key;
}

function transformArticle(article: NewsAPIArticle): RawArticle {
  return {
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.url,
    imageUrl: article.urlToImage,
    publishedAt: article.publishedAt,
    source: article.source.name,
    author: article.author,
  };
}

export async function fetchHeadlines(country = "us"): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    
    // Fetch both top-headlines and recent "everything" for broader coverage
    const [headlinesRes, recentRes] = await Promise.all([
      // Top headlines for the country
      fetch(`${NEWSAPI_BASE_URL}/top-headlines?${new URLSearchParams({
        country,
        pageSize: "30",
        apiKey,
      })}`),
      // Recent news sorted by publishedAt (last 24 hours)
      fetch(`${NEWSAPI_BASE_URL}/everything?${new URLSearchParams({
        q: "breaking OR news OR world OR politics OR economy",
        language: "en",
        sortBy: "publishedAt",
        pageSize: "30",
        apiKey,
      })}`),
    ]);

    const articles: RawArticle[] = [];

    if (headlinesRes.ok) {
      const data: NewsAPIResponse = await headlinesRes.json();
      if (data.status === "ok") {
        articles.push(
          ...data.articles
            .filter((a) => a.title && a.title !== "[Removed]")
            .map(transformArticle)
        );
      }
    }

    if (recentRes.ok) {
      const data: NewsAPIResponse = await recentRes.json();
      if (data.status === "ok") {
        articles.push(
          ...data.articles
            .filter((a) => a.title && a.title !== "[Removed]")
            .map(transformArticle)
        );
      }
    }

    return articles;
  } catch (error) {
    console.error("NewsAPI fetch error:", error);
    return [];
  }
}

export async function fetchByCategory(
  category: string,
  country = "us"
): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    
    // Map our categories to NewsAPI categories
    const categoryMap: Record<string, string> = {
      politics: "general",
      conflict: "general",
      economy: "business",
      technology: "technology",
      health: "health",
      "natural-disaster": "science",
    };
    
    const newsApiCategory = categoryMap[category] || "general";
    
    const params = new URLSearchParams({
      country,
      category: newsApiCategory,
      pageSize: "20",
      apiKey,
    });

    const response = await fetch(`${NEWSAPI_BASE_URL}/top-headlines?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data: NewsAPIResponse = await response.json();
    
    if (data.status !== "ok") {
      return [];
    }

    return data.articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .map(transformArticle);
  } catch (error) {
    console.error("NewsAPI category fetch error:", error);
    return [];
  }
}

export async function fetchEverything(query: string): Promise<RawArticle[]> {
  try {
    const apiKey = getApiKey();
    
    const params = new URLSearchParams({
      q: query,
      language: "en",
      sortBy: "publishedAt",
      pageSize: "30",
      apiKey,
    });

    const response = await fetch(`${NEWSAPI_BASE_URL}/everything?${params}`);
    
    if (!response.ok) {
      return [];
    }

    const data: NewsAPIResponse = await response.json();
    
    if (data.status !== "ok") {
      return [];
    }

    return data.articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .map(transformArticle);
  } catch (error) {
    console.error("NewsAPI everything fetch error:", error);
    return [];
  }
}

export const newsAPISource = {
  name: "NewsAPI",
  fetchHeadlines: () => fetchHeadlines(),
  fetchByCategory,
};

