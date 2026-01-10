"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useNewsStore } from "@/stores/news-store";
import { useGlobeStore } from "@/stores/globe-store";
import { supabase } from "@/lib/supabase";
import type { NewsArticle } from "@/types";

interface NewsAPIResponse {
  articles: NewsArticle[];
  source: string;
  cacheAge: number;
  isStale: boolean;
  error?: string;
}

export const POLL_INTERVAL_MS = 2 * 60 * 1000;
const INITIAL_FETCH_DELAY_MS = 500;

const CATEGORY_MAP: Record<string, string> = {
  "Politics": "politics",
  "Business": "economy",
  "Technology": "technology",
  "Science": "technology",
  "Health": "health",
  "World": "conflict",
  "Crime": "conflict",
  "Environment": "natural-disaster",
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
    if (!supabase) return;

    console.log("[Beacon] Setting up realtime subscription...");

    const channel = supabase
      .channel("articles-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "articles",
          filter: "ai_processed=eq.true",
        },
        (payload) => {
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
          };
          
          console.log("[Beacon] Realtime update:", newRecord.title?.slice(0, 40));
          
          const newsArticle: NewsArticle = {
            id: newRecord.id,
            headline: newRecord.title,
            summary: newRecord.summary || newRecord.description || "",
            content: newRecord.content || newRecord.description || "",
            location: {
              name: newRecord.location || "Unknown",
              lat: 0,
              lng: 0,
              country: "Unknown",
              region: "Unknown",
            },
            category: (CATEGORY_MAP[newRecord.category || ""] || "politics") as NewsArticle["category"],
            timestamp: new Date(newRecord.published_at || newRecord.created_at),
            source: "Unknown",
            imageUrl: newRecord.image_url || undefined,
            url: newRecord.article_url,
          };
          
          setArticles((prev) => {
            const exists = prev.some((a) => a.id === newsArticle.id);
            if (exists) {
              return prev.map((a) => (a.id === newsArticle.id ? newsArticle : a));
            }
            return [newsArticle, ...prev].slice(0, 100);
          });
          
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
      supabase.removeChannel(channel);
    };
  }, [setArticles, initializePoints]);

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
