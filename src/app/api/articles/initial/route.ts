import { NextResponse } from "next/server";
import { getInitialArticlesFromRedis } from "@/lib/news-service";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { articles, totalCount, maxPublishedAt } =
      await getInitialArticlesFromRedis(50);

    return NextResponse.json(
      { articles, totalCount, maxPublishedAt },
      {
        headers: {
          "Cache-Control": "s-maxage=10, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[Beacon] Initial articles route error:", error);
    return NextResponse.json(
      { articles: [], totalCount: 0, maxPublishedAt: null },
      { status: 500 }
    );
  }
}
