import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!hasSupabaseUrl || !hasSupabaseKey) {
      return NextResponse.json({
        articles: [],
        source: "no-config",
        cacheAge: 0,
        isStale: false,
        error:
          "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
      });
    }

    const {
      getCachedNews,
      getCacheAge,
      isCacheStale,
      getArticleCount,
      getSourceStats,
    } = await import("@/lib/news-service");

    const [articles, articleCount, sourceStats] = await Promise.all([
      getCachedNews(forceRefresh),
      getArticleCount(),
      getSourceStats(),
    ]);

    return NextResponse.json({
      articles,
      source: "supabase",
      cacheAge: getCacheAge(),
      isStale: isCacheStale(),
      stats: {
        totalArticles: articleCount,
        totalSources: sourceStats.total,
        sourcesWithErrors: sourceStats.withErrors,
        lastSync: sourceStats.lastSync?.toISOString() || null,
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
