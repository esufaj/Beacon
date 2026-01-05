import { NextResponse } from "next/server";
import { getCachedNews, getCacheAge } from "@/lib/news-service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const hasAnyKey =
      !!process.env.NEWSAPI_KEY ||
      !!process.env.GNEWS_KEY ||
      !!process.env.THENEWSAPI_KEY;

    if (!hasAnyKey) {
      return NextResponse.json(
        {
          success: false,
          error: "No API keys configured. Set NEWSAPI_KEY, GNEWS_KEY, or THENEWSAPI_KEY environment variables.",
        },
        { status: 400 }
      );
    }

    const articles = await getCachedNews(true);
    
    return NextResponse.json({
      success: true,
      articleCount: articles.length,
      cacheAge: getCacheAge(),
    });
  } catch (error) {
    console.error("News refresh error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}




