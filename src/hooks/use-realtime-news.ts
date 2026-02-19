"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useNewsStore } from "@/stores/news-store";
import { useGlobeStore } from "@/stores/globe-store";
import { supabase } from "@/lib/supabase";
import type { NewsArticle, Category, BiasRating, Sentiment, Urgency } from "@/types";
import { geocode, getRegionForCountry } from "@/lib/geocoding";
import { sanitizeLocationString } from "@/lib/location-utils";
import { formatSourceName } from "@/lib/source-utils";

interface NewsAPIResponse {
  articles: NewsArticle[];
  source: string;
  cacheAge: number;
  isStale: boolean;
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

const CATEGORY_MAP: Record<string, Category> = {
  "Politics": "politics",
  "Business": "economy",
  "Technology": "technology",
  "Science": "technology",
  "Health": "health",
  "World": "conflict",
  "Crime": "conflict",
  "Environment": "natural-disaster",
  "Sports": "politics",
  "Entertainment": "politics",
  "Education": "politics",
  "Other": "politics",
};

export function useRealtimeNews() {
  const { articles, setArticles, isLoading, setIsLoading } = useNewsStore();
  const { initializePoints } = useGlobeStore();
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [source, setSource] = useState<string>("unknown");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const locationCacheRef = useRef(
    new Map<string, LocationCacheEntry | null>()
  );

  const fetchNews = useCallback(async (useMock = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (useMock) params.set("mock", "true");
      
      const response = await fetch(`/api/news?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch news: ${response.status}`);
      }

      const data: NewsAPIResponse = await response.json();
      
      if (!mountedRef.current) return;

      if (data.error) {
        console.warn("News API warning:", data.error);
      }

      const articlesWithDates = data.articles.map((article) => ({
        ...article,
        timestamp: new Date(article.timestamp),
      }));

      const existingIds = new Set(articles.map((a) => a.id));
      const newArticles = articlesWithDates.filter((a) => !existingIds.has(a.id));
      
      if (newArticles.length > 0 || articles.length === 0) {
        const merged = [...newArticles, ...articles]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 100);
        
        setArticles(merged);
        initializePoints();
      }

      setSource(data.source);
      setLastFetch(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Failed to fetch news";
      setError(message);
      console.error("News fetch error:", err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [articles, setArticles, initializePoints, setIsLoading]);

  const refreshNews = useCallback(async () => {
    try {
      const response = await fetch("/api/news/refresh", { method: "POST" });
      if (response.ok) {
        await fetchNews();
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
  }, []);

  useEffect(() => {
    if (!supabase) {
      console.warn("[Beacon] Supabase not configured, skipping realtime subscription");
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
          filter: "ai_processed=eq.true",
        },
        async (payload) => {
          if (!mountedRef.current) return;
          
          const newRecord = payload.new as {
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
          };
          
          console.log("[Beacon] Realtime update:", newRecord.title?.slice(0, 40));
          
          if (newRecord.ai_processed === false) {
            return;
          }
          
          const cleanedLocation = sanitizeLocationString(newRecord.location);
          let cachedLocation: LocationCacheEntry | null = null;

          if (cleanedLocation) {
            const cached = locationCacheRef.current.get(cleanedLocation);
            if (cached !== undefined) {
              cachedLocation = cached;
            } else {
              const { data: cachedRows, error: cacheError } = await supabaseClient
                .from("location_cache")
                .select("location, name, lat, lng, country, region")
                .eq("location", cleanedLocation)
                .limit(1);

              if (cacheError) {
                console.warn("[Beacon] Failed to load cached location", cacheError);
              }

              cachedLocation = cachedRows?.[0] ?? null;
              locationCacheRef.current.set(cleanedLocation, cachedLocation);
            }
          }

          const locationResult =
            !cachedLocation && cleanedLocation ? geocode(cleanedLocation) : null;
          const country =
            cachedLocation?.country || locationResult?.country || "Unknown";
          const region =
            cachedLocation?.region ||
            locationResult?.region ||
            (country !== "Unknown" ? getRegionForCountry(country) : null) ||
            "Unknown";
          
          const newsArticle: NewsArticle = {
            id: newRecord.id,
            headline: newRecord.title,
            summary: newRecord.summary || newRecord.description || "",
            content: newRecord.content || newRecord.description || "",
            location: {
              name:
                cachedLocation?.name ||
                cleanedLocation ||
                locationResult?.name ||
                "Unknown",
              lat: cachedLocation?.lat ?? locationResult?.lat ?? 0,
              lng: cachedLocation?.lng ?? locationResult?.lng ?? 0,
              country,
              region,
            },
            category: CATEGORY_MAP[newRecord.category || ""] || "politics",
            timestamp: new Date(newRecord.published_at || newRecord.created_at),
            source: formatSourceName(
              newRecord.source_name,
              newRecord.source_type,
              newRecord.article_url
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
          
          const { articles: currentArticles, setArticles: updateArticles } = useNewsStore.getState();
          const exists = currentArticles.some((a: NewsArticle) => a.id === newsArticle.id);
          if (exists) {
            updateArticles(currentArticles.map((a: NewsArticle) => (a.id === newsArticle.id ? newsArticle : a)));
          } else {
            updateArticles([newsArticle, ...currentArticles].slice(0, 100));
          }
          
          initializePoints();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "articles",
        },
        (payload) => {
          if (!mountedRef.current) return;
          console.log("[Beacon] New article inserted:", (payload.new as { title: string }).title?.slice(0, 40));
        }
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
  }, [initializePoints]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log(`[Beacon] Polling for news updates...`);
      fetchNews();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchNews]);

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
