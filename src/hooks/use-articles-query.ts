"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useNewsStore } from "@/stores/news-store";
import { useEffect, useCallback, useRef, useMemo } from "react";
import type { NewsArticle } from "@/types";

interface NewsPageResponse {
  articles: NewsArticle[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number | null;
  maxPublishedAt: string | null;
  cacheLayer: string;
  isStale: boolean;
  cacheAge: number;
  source: string;
  stats?: {
    totalArticles: number;
    totalSources: number;
    sourcesWithErrors: number;
    lastSync: string | null;
  };
}

const PAGE_SIZE_DESKTOP = 50;
const PAGE_SIZE_MOBILE = 25;

function getPageSize(): number {
  if (typeof window === "undefined") return PAGE_SIZE_DESKTOP;
  return window.innerWidth < 768 ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP;
}

async function fetchPage(
  offset: number,
  limit: number,
): Promise<NewsPageResponse> {
  const res = await fetch(`/api/news?offset=${offset}&limit=${limit}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useArticlesQuery(
  ssrArticles?: NewsArticle[],
  ssrTotalCount?: number,
) {
  const setArticles = useNewsStore((s) => s.setArticles);
  const upsertArticles = useNewsStore((s) => s.upsertArticles);
  const setBackgroundLoad = useNewsStore((s) => s.setBackgroundLoad);
  const setIsLoading = useNewsStore((s) => s.setIsLoading);
  const articleCount = useNewsStore((s) => s.articles.length);

  const pageSize = useMemo(() => getPageSize(), []);
  const processedPagesRef = useRef(0);
  const initialSyncedRef = useRef(false);

  const ssrInitialData = useMemo<NewsPageResponse | undefined>(() => {
    if (!ssrArticles || ssrArticles.length === 0) return undefined;
    return {
      articles: ssrArticles,
      totalCount: ssrTotalCount ?? ssrArticles.length,
      hasMore: (ssrTotalCount ?? ssrArticles.length) > ssrArticles.length,
      nextOffset:
        (ssrTotalCount ?? ssrArticles.length) > ssrArticles.length
          ? ssrArticles.length
          : null,
      maxPublishedAt: null,
      cacheLayer: "ssr",
      isStale: false,
      cacheAge: 0,
      source: "ssr",
    };
  }, [ssrArticles, ssrTotalCount]);

  const initialQuery = useQuery({
    queryKey: ["articles", "initial", pageSize],
    queryFn: () => fetchPage(0, pageSize),
    initialData: ssrInitialData,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!initialQuery.data || initialSyncedRef.current) return;
    if (articleCount > 0) return;

    initialSyncedRef.current = true;
    setArticles(initialQuery.data.articles);
    setIsLoading(false);

    if (initialQuery.data.hasMore && initialQuery.data.nextOffset) {
      setBackgroundLoad({
        hasMore: true,
        nextOffset: initialQuery.data.nextOffset,
        estimatedTotal: initialQuery.data.totalCount,
        isBackgroundLoading: true,
      });
    }
  }, [
    initialQuery.data,
    articleCount,
    setArticles,
    setIsLoading,
    setBackgroundLoad,
  ]);

  const backgroundQuery = useInfiniteQuery({
    queryKey: ["articles", "background", pageSize],
    queryFn: ({ pageParam }) => fetchPage(pageParam, pageSize),
    initialPageParam: pageSize,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: !!initialQuery.data && initialQuery.data.hasMore,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: bgData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = backgroundQuery;

  const bgPages = bgData?.pages;
  const bgPageCount = bgPages?.length ?? 0;

  useEffect(() => {
    if (!bgPages || bgPageCount === 0) return;
    if (bgPageCount <= processedPagesRef.current) return;

    const newPages = bgPages.slice(processedPagesRef.current);
    processedPagesRef.current = bgPageCount;

    const allNewArticles = newPages.flatMap((p) => p.articles);
    if (allNewArticles.length === 0) return;

    upsertArticles(allNewArticles);

    const latestPage = bgPages[bgPages.length - 1];
    setBackgroundLoad({
      loadedCount:
        bgPages.reduce((sum, p) => sum + p.articles.length, 0) + pageSize,
      hasMore: latestPage.hasMore,
      nextOffset: latestPage.nextOffset,
      estimatedTotal: latestPage.totalCount,
    });
  }, [bgPages, bgPageCount, upsertArticles, setBackgroundLoad, pageSize]);

  useEffect(() => {
    if (
      bgPageCount > 0 &&
      bgPageCount === processedPagesRef.current &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [bgPageCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!hasNextPage && bgPageCount > 0) {
      setBackgroundLoad({ isBackgroundLoading: false });
    }
  }, [hasNextPage, bgPageCount, setBackgroundLoad]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { refetch } = initialQuery;
  const refreshNews = useCallback(async () => {
    setIsLoading(true);
    initialSyncedRef.current = false;
    processedPagesRef.current = 0;
    await refetch();
  }, [refetch, setIsLoading]);

  return {
    isLoading: initialQuery.isLoading,
    error: initialQuery.error?.message ?? null,
    source: initialQuery.data?.source ?? "loading",
    refreshNews,
    loadMore,
  };
}
