"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useNewsStore } from "@/stores/news-store";
import { useGlobeStore } from "@/stores/globe-store";
import type { NewsArticle } from "@/types";

interface NewsAPIResponse {
  articles: NewsArticle[];
  source: string;
  cacheAge: number;
  isStale: boolean;
  error?: string;
}

export const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes for fresher news
const INITIAL_FETCH_DELAY_MS = 500; // 0.5 second after mount

export function useRealtimeNews() {
  const { articles, setArticles, isLoading, setIsLoading } = useNewsStore();
  const { initializePoints } = useGlobeStore();
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [source, setSource] = useState<string>("unknown");
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

      // Parse timestamps from JSON
      const articlesWithDates = data.articles.map((article) => ({
        ...article,
        timestamp: new Date(article.timestamp),
      }));

      // Merge new articles with existing ones, avoiding duplicates
      const existingIds = new Set(articles.map((a) => a.id));
      const newArticles = articlesWithDates.filter((a) => !existingIds.has(a.id));
      
      if (newArticles.length > 0 || articles.length === 0) {
        // Sort by timestamp (newest first) and limit to reasonable number
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
  }, [articles, setArticles, initializePoints]);

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

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    
    const timeoutId = setTimeout(() => {
      fetchNews();
    }, INITIAL_FETCH_DELAY_MS);

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log(`[Beacon] Polling for news updates... (every ${POLL_INTERVAL_MS / 60000} minutes)`);
      fetchNews();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchNews]);

  return {
    isLoading,
    error,
    lastFetch,
    source,
    fetchNews,
    refreshNews,
  };
}
