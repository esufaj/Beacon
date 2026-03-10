"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { GlobeErrorBoundary } from "@/components/globe/maplibre-globe";
import { GlobeControls } from "@/components/globe/globe-controls";
import { NewsSidebar } from "@/components/news/news-sidebar";
import { ArticleDrawer } from "@/components/news/article-drawer";
import { BeaconLogo } from "@/components/beacon-logo";
import { Button } from "@/components/ui/button";
import { useGlobeStore } from "@/stores/globe-store";
import { useNewsStore } from "@/stores/news-store";
import { useUIStore } from "@/stores/ui-store";
import { useArticlesQuery } from "@/hooks/use-articles-query";
import { useRealtimeArticles } from "@/hooks/use-realtime-articles";
import type { NewsArticle } from "@/types";

const MapLibreGlobe = dynamic(
  () =>
    import("@/components/globe/maplibre-globe").then((m) => m.MapLibreGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="font-mono text-3xl text-muted-foreground/30 animate-pulse">
          ◐
        </div>
      </div>
    ),
  },
);

interface DashboardClientProps {
  initialArticles: NewsArticle[];
  totalCount: number;
}

export function DashboardClient({
  initialArticles,
  totalCount,
}: DashboardClientProps) {
  const initializePoints = useGlobeStore((s) => s.initializePoints);
  const points = useGlobeStore((s) => s.points);
  const articleCount = useNewsStore((s) => s.articles.length);
  const articles = useNewsStore((s) => s.articles);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const { isLoading, source } = useArticlesQuery(initialArticles, totalCount);
  useRealtimeArticles();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializePointsStable = useCallback(
    (arts: NewsArticle[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => initializePoints(arts), 150);
    },
    [initializePoints],
  );

  useEffect(() => {
    initializePointsStable(articles);
  }, [articleCount, initializePointsStable, articles]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const activeLocationsCount = useMemo(
    () => points.filter((p) => p.hasNews).length,
    [points],
  );

  const displayCount = articleCount || totalCount;

  return (
    <main className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <NewsSidebar />

      <div className="flex-1 relative min-w-0">
        <GlobeErrorBoundary>
          <MapLibreGlobe />
        </GlobeErrorBoundary>
        <GlobeControls />

        {/* Mobile header */}
        <div
          className="absolute top-3 left-3 z-10 flex items-center gap-3 lg:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 glass rounded-lg bg-card border border-border shadow-sm hover:bg-accent"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <BeaconLogo />
            <span className="text-[14px] font-semibold text-foreground">
              Beacon
            </span>
          </div>
        </div>

        {/* Status pill */}
        <div
          className="absolute top-3 right-3 lg:top-5 lg:left-5 lg:right-auto z-10"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2">
            {isLoading ? (
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
            ) : (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            )}
            <span className="text-[11px] text-muted-foreground tabular-nums font-mono">
              <span className="text-foreground font-medium">
                {displayCount}
              </span>
              <span className="hidden sm:inline"> stories</span>
              <span className="text-muted-foreground/40 mx-1 sm:mx-1.5">•</span>
              <span className="text-foreground font-medium">
                {activeLocationsCount}
              </span>
              <span className="hidden sm:inline"> locations</span>
              {source === "error" && (
                <span className="text-destructive ml-1.5 font-medium">!</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <ArticleDrawer />
    </main>
  );
}
