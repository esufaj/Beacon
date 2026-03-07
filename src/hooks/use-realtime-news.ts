"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useNewsStore } from "@/stores/news-store";
import { supabase } from "@/lib/supabase";
import type {
  NewsArticle,
  Category,
  BiasRating,
  Sentiment,
  Urgency,
} from "@/types";
import { geocode, getRegionForCountry } from "@/lib/geocoding";
import { sanitizeLocationString } from "@/lib/location-utils";
import { formatSourceName } from "@/lib/source-utils";

interface NewsAPIResponse {
  articles: NewsArticle[];
  source: string;
  cacheAge: number;
  isStale: boolean;
  cacheLayer?: string;
  totalCount?: number;
  hasMore?: boolean;
  nextOffset?: number | null;
  maxPublishedAt?: string | null;
  error?: string;
}

type LocationCacheEntry = {
  location: string;
  name: string | null;
  lat: number | null;
  lng: number | null;
  country: string | null;
  region: string | null;
};

export const POLL_INTERVAL_MS = 2 * 60 * 1000;
const INITIAL_FETCH_DELAY_MS = 100;
const PAGE_SIZE = 50;
const HOURS_BACK = 24;
const BATCH_RETRY_LIMIT = 3;
const BATCH_RETRY_BASE_MS = 800;
const NEW_BADGE_DURATION_MS = 5 * 60 * 1000;

const CATEGORY_MAP: Record<string, Category> = {
  Politics: "politics",
  Business: "economy",
  Technology: "technology",
  Science: "science",
  Health: "health",
  World: "conflict",
  Crime: "crime",
  Environment: "environment",
  Sports: "sports",
  Entertainment: "entertainment",
  Education: "education",
  Other: "politics",
};

export function useRealtimeNews() {
  const setArticles = useNewsStore((state) => state.setArticles);
  const upsertArticles = useNewsStore((state) => state.upsertArticles);
  const upsertArticle = useNewsStore((state) => state.upsertArticle);
  const setLastKnownMaxPublishedAt = useNewsStore(
    (state) => state.setLastKnownMaxPublishedAt,
  );
  const setBackgroundLoad = useNewsStore((state) => state.setBackgroundLoad);
  const manualLoadMoreTick = useNewsStore((state) => state.manualLoadMoreTick);
  const isLoading = useNewsStore((state) => state.isLoading);
  const setIsLoading = useNewsStore((state) => state.setIsLoading);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [source, setSource] = useState<string>("unknown");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const mountedRef = useRef(true);
  const backgroundLoadingRef = useRef(false);
  const pollingRef = useRef(false);
  const locationCacheRef = useRef(new Map<string, LocationCacheEntry | null>());
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPage = useCallback(
    async (offset: number, forceRefresh = false): Promise<NewsAPIResponse> => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE_SIZE),
        hoursBack: String(HOURS_BACK),
      });
      if (forceRefresh) {
        params.set("forceRefresh", "true");
      }

      const response = await fetch(`/api/news?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch news page: ${response.status}`);
      }
      const payload = (await response.json()) as NewsAPIResponse;
      payload.articles = payload.articles.map((article) => ({
        ...article,
        timestamp: new Date(article.timestamp),
      }));
      return payload;
    },
    [],
  );

  const scheduleNewBadgeRemoval = useCallback((articleId: string) => {
    window.setTimeout(() => {
      useNewsStore.getState().removeNewArticleFlag(articleId);
    }, NEW_BADGE_DURATION_MS);
  }, []);

  const syncCacheForArticle = useCallback(async (articleId: string) => {
    try {
      await fetch("/api/news/cache-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
    } catch {
      // Best-effort cache sync only.
    }
  }, []);

  const runBackgroundFill = useCallback(
    async (startOffset: number, estimatedTotal: number | null) => {
      if (backgroundLoadingRef.current) return;
      backgroundLoadingRef.current = true;
      let currentOffset: number | null = startOffset;
      let failures = 0;

      setBackgroundLoad({
        isBackgroundLoading: true,
        estimatedTotal,
        nextOffset: startOffset,
        hasMore: true,
      });

      while (mountedRef.current && currentOffset !== null) {
        let page: NewsAPIResponse | null = null;

        for (let attempt = 0; attempt < BATCH_RETRY_LIMIT; attempt += 1) {
          try {
            page = await fetchPage(currentOffset);
            break;
          } catch (err) {
            if (attempt === BATCH_RETRY_LIMIT - 1) {
              failures += 1;
              console.warn("[Beacon] Background batch fetch failed", err);
            } else {
              const delay = BATCH_RETRY_BASE_MS * (attempt + 1);
              await new Promise((resolve) => {
                retryTimeoutRef.current = setTimeout(resolve, delay);
              });
            }
          }
        }

        if (!page) break;

        if (page.articles.length > 0) {
          upsertArticles(page.articles);
        }

        const loadedCount = useNewsStore.getState().articles.length;
        const hasMore = Boolean(page.hasMore && page.nextOffset !== null);
        currentOffset = hasMore ? (page.nextOffset ?? null) : null;

        setBackgroundLoad({
          isBackgroundLoading: hasMore,
          loadedCount,
          estimatedTotal: page.totalCount ?? estimatedTotal,
          hasMore,
          nextOffset: currentOffset,
          failedBatches: failures,
        });

        if (!hasMore) break;
      }

      backgroundLoadingRef.current = false;
      setBackgroundLoad({ isBackgroundLoading: false });
    },
    [fetchPage, setBackgroundLoad, upsertArticles],
  );

  /**
   * Loading lifecycle:
   * - Cold start: fetch first 50 rows for instant paint.
   * - Background fill: walk paginated 24h window in 50-row chunks.
   * - Realtime: inject new records through sorted store with cursor-based gating.
   * - Polling fallback: top-page checks to recover missed realtime events.
   */
  const fetchNews = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const firstPage = await fetchPage(0, forceRefresh);
        if (!mountedRef.current) return;

        if (firstPage.error) {
          console.warn("News API warning:", firstPage.error);
        }

        setArticles(firstPage.articles);
        const maxPublishedAt =
          firstPage.maxPublishedAt ??
          firstPage.articles[0]?.timestamp.toISOString() ??
          null;
        setLastKnownMaxPublishedAt(maxPublishedAt);

        setBackgroundLoad({
          loadedCount: firstPage.articles.length,
          estimatedTotal: firstPage.totalCount ?? firstPage.articles.length,
          hasMore: Boolean(firstPage.hasMore),
          nextOffset: firstPage.nextOffset ?? null,
          failedBatches: 0,
          isBackgroundLoading: false,
        });

        setSource(firstPage.source);
        setLastFetch(new Date());

        if (
          firstPage.hasMore &&
          firstPage.nextOffset !== null &&
          firstPage.nextOffset !== undefined
        ) {
          void runBackgroundFill(
            firstPage.nextOffset,
            firstPage.totalCount ?? firstPage.articles.length,
          );
        }
      } catch (err) {
        if (!mountedRef.current) return;
        const message =
          err instanceof Error ? err.message : "Failed to fetch news";
        setError(message);
        console.error("News fetch error:", err);
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      fetchPage,
      runBackgroundFill,
      setArticles,
      setBackgroundLoad,
      setIsLoading,
      setLastKnownMaxPublishedAt,
    ],
  );

  const pollForNewArticles = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;

    try {
      const page = await fetchPage(0);
      if (!mountedRef.current) return;

      const lastKnown = useNewsStore.getState().lastKnownMaxPublishedAt;
      const cursorTime = lastKnown ? new Date(lastKnown).getTime() : 0;
      const newArticles = page.articles.filter(
        (article) => article.timestamp.getTime() > cursorTime,
      );

      if (newArticles.length > 0) {
        upsertArticles(newArticles, { markAsNew: true });
        const nextCursor = newArticles[0]?.timestamp.toISOString();
        if (nextCursor) {
          setLastKnownMaxPublishedAt(nextCursor);
        }
        for (const article of newArticles) {
          scheduleNewBadgeRemoval(article.id);
          void syncCacheForArticle(article.id);
        }
      }

      setSource(page.source);
      setLastFetch(new Date());
    } catch (err) {
      console.warn("[Beacon] Polling fallback failed", err);
    } finally {
      pollingRef.current = false;
    }
  }, [
    fetchPage,
    scheduleNewBadgeRemoval,
    setLastKnownMaxPublishedAt,
    syncCacheForArticle,
    upsertArticles,
  ]);

  const refreshNews = useCallback(async () => {
    try {
      const response = await fetch("/api/news/refresh", { method: "POST" });
      if (response.ok) {
        await fetchNews(true);
      }
    } catch (err) {
      console.error("Failed to refresh news:", err);
    }
  }, [fetchNews]);

  useEffect(() => {
    mountedRef.current = true;

    const timeoutId = setTimeout(() => {
      fetchNews();
    }, INITIAL_FETCH_DELAY_MS);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [fetchNews]);

  const transformRealtimePayload = useCallback(
    async (
      newRecord: {
        id: string;
        title: string;
        summary: string | null;
        content: string | null;
        description: string | null;
        location: string | null;
        category: string | null;
        published_at: string | null;
        created_at: string;
        image_url: string | null;
        article_url: string;
        credibility_score: number | null;
        bias_rating: string | null;
        sentiment: string | null;
        urgency: string | null;
        reading_time: number | null;
        word_count: number | null;
        keywords: string[] | null;
        entities_people: string[] | null;
        entities_organizations: string[] | null;
        entities_locations: string[] | null;
        article_type: string | null;
        target_audience: string | null;
        source_name: string | null;
        source_type: string | null;
        ai_processed: boolean | null;
      },
      supabaseClient: NonNullable<typeof supabase>,
    ): Promise<NewsArticle | null> => {
      if (newRecord.ai_processed === false) {
        return null;
      }

      const cleanedLocation = sanitizeLocationString(newRecord.location);
      let cachedLocation: LocationCacheEntry | null = null;

      if (cleanedLocation) {
        const cached = locationCacheRef.current.get(cleanedLocation);
        if (cached !== undefined) {
          cachedLocation = cached;
        } else {
          const { data: cachedRows } = await supabaseClient
            .from("location_cache")
            .select("location, name, lat, lng, country, region")
            .eq("location", cleanedLocation)
            .limit(1);
          cachedLocation = cachedRows?.[0] ?? null;
          locationCacheRef.current.set(cleanedLocation, cachedLocation);
        }
      }

      const geocoded =
        !cachedLocation && cleanedLocation ? geocode(cleanedLocation) : null;
      const country = cachedLocation?.country || geocoded?.country || "Unknown";
      const region =
        cachedLocation?.region ||
        geocoded?.region ||
        (country !== "Unknown" ? getRegionForCountry(country) : null) ||
        "Unknown";

      return {
        id: newRecord.id,
        headline: newRecord.title,
        summary: newRecord.summary || newRecord.description || "",
        content: newRecord.content || newRecord.description || "",
        location: {
          name:
            cachedLocation?.name ||
            cleanedLocation ||
            geocoded?.name ||
            "Unknown",
          lat: cachedLocation?.lat ?? geocoded?.lat ?? 0,
          lng: cachedLocation?.lng ?? geocoded?.lng ?? 0,
          country,
          region,
        },
        category: CATEGORY_MAP[newRecord.category || ""] || "politics",
        timestamp: new Date(newRecord.published_at || newRecord.created_at),
        source: formatSourceName(
          newRecord.source_name,
          newRecord.source_type,
          newRecord.article_url,
        ),
        imageUrl: newRecord.image_url || undefined,
        url: newRecord.article_url,
        credibilityScore: newRecord.credibility_score || undefined,
        biasRating: (newRecord.bias_rating as BiasRating) || undefined,
        sentiment: (newRecord.sentiment as Sentiment) || undefined,
        urgency: (newRecord.urgency as Urgency) || undefined,
        readingTime: newRecord.reading_time || undefined,
        wordCount: newRecord.word_count || undefined,
        keywords: newRecord.keywords || undefined,
        entitiesPeople: newRecord.entities_people || undefined,
        entitiesOrganizations: newRecord.entities_organizations || undefined,
        entitiesLocations: newRecord.entities_locations || undefined,
        articleType: newRecord.article_type || undefined,
        targetAudience: newRecord.target_audience || undefined,
      };
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      console.warn(
        "[Beacon] Supabase not configured, skipping realtime subscription",
      );
      return;
    }

    const supabaseClient = supabase;
    console.log("[Beacon] Setting up realtime subscription...");

    const channel = supabaseClient
      .channel("articles-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "articles",
        },
        async (payload) => {
          if (!mountedRef.current) return;
          const record = payload.new as Parameters<
            typeof transformRealtimePayload
          >[0];
          const article = await transformRealtimePayload(
            record,
            supabaseClient,
          );
          if (!article) return;

          const state = useNewsStore.getState();
          const lastKnown = state.lastKnownMaxPublishedAt
            ? new Date(state.lastKnownMaxPublishedAt).getTime()
            : 0;
          const exists = Boolean(state.articleIndex[article.id]);
          const isNewArticle =
            !exists && article.timestamp.getTime() > lastKnown;

          upsertArticle(article, { markAsNew: isNewArticle });

          if (article.timestamp.getTime() > lastKnown) {
            setLastKnownMaxPublishedAt(article.timestamp.toISOString());
          }

          if (isNewArticle) {
            scheduleNewBadgeRemoval(article.id);
            void syncCacheForArticle(article.id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "articles",
        },
        async (payload) => {
          if (!mountedRef.current) return;
          const record = payload.new as Parameters<
            typeof transformRealtimePayload
          >[0];
          const article = await transformRealtimePayload(
            record,
            supabaseClient,
          );
          if (!article) return;

          const state = useNewsStore.getState();
          const lastKnown = state.lastKnownMaxPublishedAt
            ? new Date(state.lastKnownMaxPublishedAt).getTime()
            : 0;
          const exists = Boolean(state.articleIndex[article.id]);
          const isNewArticle =
            !exists && article.timestamp.getTime() > lastKnown;

          upsertArticle(article, { markAsNew: isNewArticle });

          if (article.timestamp.getTime() > lastKnown) {
            setLastKnownMaxPublishedAt(article.timestamp.toISOString());
          }

          if (isNewArticle) {
            scheduleNewBadgeRemoval(article.id);
            void syncCacheForArticle(article.id);
          }
        },
      )
      .subscribe((status) => {
        console.log("[Beacon] Realtime subscription status:", status);
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      console.log("[Beacon] Cleaning up realtime subscription...");
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [
    scheduleNewBadgeRemoval,
    setLastKnownMaxPublishedAt,
    syncCacheForArticle,
    transformRealtimePayload,
    upsertArticle,
  ]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log(`[Beacon] Polling for news updates...`);
      void pollForNewArticles();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [pollForNewArticles]);

  useEffect(() => {
    if (manualLoadMoreTick === 0) return;
    const state = useNewsStore.getState();
    if (
      state.backgroundLoad.hasMore &&
      !backgroundLoadingRef.current &&
      state.backgroundLoad.nextOffset !== null
    ) {
      void runBackgroundFill(
        state.backgroundLoad.nextOffset,
        state.backgroundLoad.estimatedTotal,
      );
    }
  }, [manualLoadMoreTick, runBackgroundFill]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    error,
    lastFetch,
    source,
    realtimeConnected,
    fetchNews,
    refreshNews,
  };
}
