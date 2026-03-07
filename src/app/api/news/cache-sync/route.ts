import { NextResponse } from "next/server";
import { syncArticleIntoCache } from "@/lib/news-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      articleId?: string;
    };

    if (!body.articleId) {
      return NextResponse.json(
        { success: false, error: "Missing articleId" },
        { status: 400 }
      );
    }

    const synced = await syncArticleIntoCache(body.articleId);
    return NextResponse.json({ success: synced });
  } catch (error) {
    console.error("[Beacon] cache-sync route failed", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

