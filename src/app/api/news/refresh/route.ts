import { NextResponse } from "next/server";
import { getNewsPage } from "@/lib/news-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = request.headers.get("x-refresh-secret");
  if (secret !== process.env.CACHE_REFRESH_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const page = await getNewsPage({
      offset: 0,
      limit: 50,
      hoursBack: 24,
      forceRefresh: true,
    });

    return NextResponse.json({
      success: true,
      articleCount: page.totalCount,
      cacheLayer: page.cacheLayer,
      cacheAge: page.cacheAgeMs,
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
