import { NextResponse } from "next/server";
import { getCachedNews, getCacheAge, isCacheStale } from "@/lib/news-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  try {
    // Check if API keys are configured
    const hasNewsAPI = !!process.env.NEWSAPI_KEY;
    const hasGNews = !!process.env.GNEWS_KEY;
    const hasTheNewsAPI = !!process.env.THENEWSAPI_KEY;
    const hasMediaStack = !!process.env.MEDIASTACK_KEY;
    const hasAnyKey = hasNewsAPI || hasGNews || hasTheNewsAPI || hasMediaStack;

    if (!hasAnyKey) {
      return NextResponse.json({
        articles: [],
        source: "no-keys",
        cacheAge: 0,
        isStale: false,
        error: "No API keys configured. Add NEWSAPI_KEY, GNEWS_KEY, THENEWSAPI_KEY, or MEDIASTACK_KEY to .env.local",
        configuredSources: {
          newsapi: hasNewsAPI,
          gnews: hasGNews,
          thenewsapi: hasTheNewsAPI,
          mediastack: hasMediaStack,
        },
      });
    }

    const articles = await getCachedNews(forceRefresh);
    
    return NextResponse.json({
      articles,
      source: "api",
      cacheAge: getCacheAge(),
      isStale: isCacheStale(),
      configuredSources: {
        newsapi: hasNewsAPI,
        gnews: hasGNews,
        thenewsapi: hasTheNewsAPI,
        mediastack: hasMediaStack,
      },
    });
  } catch (error) {
    console.error("News API error:", error);
    
    return NextResponse.json({
      articles: [],
      source: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      cacheAge: 0,
      isStale: false,
    });
  }
}

