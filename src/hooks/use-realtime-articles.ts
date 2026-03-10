"use client";

import { useEffect, useRef, useCallback } from "react";
import { useNewsStore } from "@/stores/news-store";
import type { NewsArticle } from "@/types";

const NEW_BADGE_DURATION_MS = 5 * 60 * 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClientSingleton: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseClientPromise: Promise<any> | null = null;

async function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (supabaseClientSingleton) return supabaseClientSingleton;
  if (supabaseClientPromise) return supabaseClientPromise;

  supabaseClientPromise = import("@supabase/supabase-js").then((mod) => {
    supabaseClientSingleton = mod.createClient(url, key);
    return supabaseClientSingleton;
  });

  return supabaseClientPromise;
}

function transformBroadcastPayload(
  payload: Record<string, unknown>,
): NewsArticle | null {
  const a = payload.article as Record<string, unknown> | undefined;
  if (!a?.id || !a?.headline) return null;

  return {
    id: String(a.id),
    headline: String(a.headline ?? ""),
    summary: String(a.summary ?? ""),
    content: String(a.content ?? ""),
    location: (a.location as NewsArticle["location"]) ?? {
      name: "Unknown",
      lat: 0,
      lng: 0,
      country: "Unknown",
      region: "Unknown",
    },
    category: String(a.category ?? "other") as NewsArticle["category"],
    timestamp: new Date(String(a.timestamp ?? new Date().toISOString())),
    source: String(a.source ?? "Unknown"),
    imageUrl: (a.imageUrl as string) ?? null,
    url: String(a.url ?? ""),
    credibilityScore: Number(a.credibilityScore ?? 5),
    biasRating: (a.biasRating as NewsArticle["biasRating"]) ?? undefined,
    sentiment: (a.sentiment as NewsArticle["sentiment"]) ?? undefined,
    urgency: (a.urgency as NewsArticle["urgency"]) ?? undefined,
    readingTime: Number(a.readingTime ?? 0),
    wordCount: Number(a.wordCount ?? 0),
    keywords: (a.keywords as string[]) ?? [],
    entitiesPeople: (a.entitiesPeople as string[]) ?? [],
    entitiesOrganizations: (a.entitiesOrganizations as string[]) ?? [],
    entitiesLocations: (a.entitiesLocations as string[]) ?? [],
    articleType: (a.articleType as string) ?? null,
    targetAudience: (a.targetAudience as string) ?? null,
  };
}

export function useRealtimeArticles() {
  const upsertArticle = useNewsStore((s) => s.upsertArticle);
  const removeNewArticleFlag = useNewsStore((s) => s.removeNewArticleFlag);
  const setRealtimeConnected = useNewsStore((s) => s.setRealtimeConnected);
  const lastKnownMaxPublishedAt = useNewsStore(
    (s) => s.lastKnownMaxPublishedAt,
  );

  const lastMaxRef = useRef(lastKnownMaxPublishedAt);
  useEffect(() => {
    lastMaxRef.current = lastKnownMaxPublishedAt;
  }, [lastKnownMaxPublishedAt]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const badgeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mountedRef = useRef(true);

  const scheduleBadgeRemoval = useCallback(
    (articleId: string) => {
      const existing = badgeTimers.current.get(articleId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        if (!mountedRef.current) return;
        removeNewArticleFlag(articleId);
        badgeTimers.current.delete(articleId);
      }, NEW_BADGE_DURATION_MS);

      badgeTimers.current.set(articleId, timer);
    },
    [removeNewArticleFlag],
  );

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    getSupabaseClient().then((supabase) => {
      if (cancelled || !supabase) return;

      const channel = supabase
        .channel("article-ready")
        .on(
          "broadcast",
          { event: "article_ready" },
          (payload: { payload: Record<string, unknown> }) => {
            const article = transformBroadcastPayload(payload.payload);
            if (!article) return;

            const maxTs = lastMaxRef.current
              ? new Date(lastMaxRef.current).getTime()
              : 0;
            const isNew = article.timestamp.getTime() > maxTs;

            upsertArticle(article, { markAsNew: isNew });
            if (isNew) scheduleBadgeRemoval(article.id);
          },
        )
        .subscribe((status: string) => {
          setRealtimeConnected(status === "SUBSCRIBED");
        });

      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      for (const timer of badgeTimers.current.values()) {
        clearTimeout(timer);
      }
      badgeTimers.current.clear();
      setRealtimeConnected(false);
    };
  }, [upsertArticle, setRealtimeConnected, scheduleBadgeRemoval]);
}
