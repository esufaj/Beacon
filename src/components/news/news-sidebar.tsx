"use client";

import { Globe2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNewsStore } from "@/stores/news-store";
import { useGlobeStore } from "@/stores/globe-store";
import { useUIStore } from "@/stores/ui-store";
import { NewsCard } from "./news-card";
import { SearchCombobox } from "@/components/search/search-combobox";
import { BeaconLogo } from "@/components/beacon-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { POLL_INTERVAL_MS } from "@/hooks/use-realtime-news";

export function NewsSidebar() {
  const {
    filteredArticles,
    selectedLocationId,
    selectedRegion,
    clearFilters,
    isLoading,
  } = useNewsStore();

  const {
    selectedPoint,
    setSelectedPoint,
    setAutoRotating,
    resetView,
    projection,
  } = useGlobeStore();

  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  const hasActiveFilter = selectedLocationId || selectedRegion;

  const handleClearFilter = () => {
    clearFilters();
    setSelectedPoint(null);
    if (projection !== "mercator") {
      setAutoRotating(true);
    }
    resetView();
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={handleCloseSidebar}
        />
      )}

      <aside
        className={cn(
          "w-[340px] h-screen flex flex-col border-r border-border",
          "bg-card",
          "fixed lg:relative z-50",
          "transition-all duration-300 ease-[cubic-bezier(0.16, 1, 0.3, 1)]",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <BeaconLogo />
              <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
                Beacon
              </h1>
            </div>
            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseSidebar}
                className="h-8 w-8 lg:hidden rounded-lg hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SearchCombobox />

          {hasActiveFilter && (
            <div className="mt-4 flex items-center justify-between py-2 px-3 rounded-lg bg-accent/50 border border-border">
              <div className="flex items-center gap-2 text-[13px]">
                <Globe2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-muted-foreground">Filtering:</span>
                <span className="text-foreground font-medium">
                  {selectedPoint?.name || selectedRegion || selectedLocationId}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilter}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Section header */}
        <div className="px-5 py-2.5 flex items-center justify-between flex-shrink-0 border-y border-border bg-muted/30">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Latest Stories
          </h2>
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {filteredArticles.length} stories
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading && filteredArticles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mb-4">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              </div>
              <p className="text-foreground text-sm font-medium mb-1">
                Loading stories...
              </p>
              <p className="text-muted-foreground text-[13px]">
                Fetching latest news from around the world
              </p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4">
                <Globe2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm font-medium mb-1">
                No stories found
              </p>
              <p className="text-muted-foreground text-[13px] mb-3">
                Try selecting a different location
              </p>
              <Button
                variant="outline"
                onClick={handleClearFilter}
                className="text-[13px] h-8 rounded-lg"
              >
                View all stories
              </Button>
            </div>
          ) : (
            <div className="py-1">
              {filteredArticles.map((article, index) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  index={index}
                  isLast={index === filteredArticles.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex-shrink-0 bg-muted/20">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium"> Live </span>
            </div>
            <span className="tabular-nums">
              Updates every {Math.round(POLL_INTERVAL_MS / 60000)}m
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
