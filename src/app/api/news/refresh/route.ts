import { NextResponse } from "next/server";
import { getNewsPage } from "@/lib/news-service";

export const dynamic = "force-dynamic";

export async function POST() {
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




