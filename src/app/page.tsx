"use client";

import { useEffect, useMemo } from "react";
import { Menu } from "lucide-react";
import { MapLibreGlobe } from "@/components/globe/maplibre-globe";
import { GlobeControls } from "@/components/globe/globe-controls";
import { NewsSidebar } from "@/components/news/news-sidebar";
import { ArticleDrawer } from "@/components/news/article-drawer";
import { BeaconLogo } from "@/components/beacon-logo";
import { Button } from "@/components/ui/button";
import { useGlobeStore } from "@/stores/globe-store";
import { useNewsStore } from "@/stores/news-store";
import { useUIStore } from "@/stores/ui-store";
import { useRealtimeNews } from "@/hooks/use-realtime-news";

export default function Home() {
  const { initializePoints, points } = useGlobeStore();
  const { articles } = useNewsStore();
  const { toggleSidebar } = useUIStore();

  const { isLoading, source } = useRealtimeNews();

  useEffect(() => {
    initializePoints(articles);
  }, [articles, initializePoints]);

  const activeLocationsCount = useMemo(
    () => points.filter((p) => p.hasNews).length,
    [points]
  );

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background">
      <NewsSidebar />

      <div className="flex-1 relative min-w-0">
        <MapLibreGlobe />
        <GlobeControls />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 glass rounded-md"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <BeaconLogo />
            <span className="text-sm font-bold">Beacon</span>
          </div>
        </div>

        <div className="absolute top-4 right-4 lg:top-6 lg:left-6 lg:right-auto z-10">
          <div className="glass rounded-full px-3 py-1.5 lg:px-4 lg:py-2 flex items-center gap-2">
            {isLoading ? (
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-glow" />
            )}
            <span className="text-[10px] lg:text-xs text-muted-foreground">
              <span className="text-foreground font-bold">
                {articles.length}
              </span>
              <span className="hidden sm:inline"> stories</span>
              <span className="hidden sm:inline text-muted-foreground/50 mx-1">
                •
              </span>
              <span className="text-blue-500 font-bold">
                {activeLocationsCount}
              </span>
              <span className="hidden sm:inline"> locations</span>
              {source === "error" && (
                <span className="text-red-400 ml-1">!</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <ArticleDrawer />
    </main>
  );
}
