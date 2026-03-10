"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Globe2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNewsStore } from "@/stores/news-store";
import { useGlobeStore } from "@/stores/globe-store";
import { useUIStore } from "@/stores/ui-store";
import { useArticlesQuery } from "@/hooks/use-articles-query";
import { NewsCard } from "./news-card";
import { NewsCardSkeletonList } from "./news-card-skeleton";
import { SearchCombobox } from "@/components/search/search-combobox";
import { BeaconLogo } from "@/components/beacon-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export function NewsSidebar() {
  const CARD_ROW_GAP_PX = 8;
  const LIST_EDGE_PADDING_PX = 10;
  const filteredArticles = useNewsStore((s) => s.filteredArticles);
  const clearFilters = useNewsStore((s) => s.clearFilters);
  const isLoading = useNewsStore((s) => s.isLoading);
  const backgroundLoad = useNewsStore((s) => s.backgroundLoad);
  const newArticleIds = useNewsStore((s) => s.newArticleIds);

  const setSelectedPoint = useGlobeStore((s) => s.setSelectedPoint);
  const setAutoRotating = useGlobeStore((s) => s.setAutoRotating);
  const resetView = useGlobeStore((s) => s.resetView);
  const projection = useGlobeStore((s) => s.projection);

  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const { loadMore } = useArticlesQuery();
  const isMobile = useIsMobile();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef(filteredArticles.length);
  const newIdsSet = newArticleIds;

  const rowVirtualizer = useVirtualizer({
    count: filteredArticles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    getItemKey: (index) => filteredArticles[index]?.id ?? index,
    paddingStart: LIST_EDGE_PADDING_PX,
    paddingEnd: LIST_EDGE_PADDING_PX,
    overscan: isMobile ? 3 : 5,
    measureElement: (el) => el?.getBoundingClientRect().height ?? 92,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  useLayoutEffect(() => {
    const current = filteredArticles.length;
    const prev = prevCountRef.current;
    const container = parentRef.current;

    if (current > prev && container && container.scrollTop > 10) {
      const addedItems = current - prev;
      let addedHeight = 0;
      for (let i = 0; i < addedItems; i++) {
        addedHeight += rowVirtualizer.measurementsCache[i]?.size ?? 92;
      }
      container.scrollTop += addedHeight;
    }

    prevCountRef.current = current;
  }, [filteredArticles.length, rowVirtualizer.measurementsCache]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        loadMoreRef.current();
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

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
          "w-[340px] h-[100dvh] flex flex-col border-r border-border",
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
        <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading && filteredArticles.length === 0 ? (
            <NewsCardSkeletonList count={6} />
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
            <div
              className="relative"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {virtualItems.map((virtualRow) => {
                const article = filteredArticles[virtualRow.index];
                if (!article) return null;
                return (
                  <div
                    key={article.id}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="absolute left-0 top-0 w-full px-2"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: `${CARD_ROW_GAP_PX}px`,
                      ...(isMobile ? { contentVisibility: "auto", containIntrinsicSize: "auto 92px" } : {}),
                    }}
                  >
                    <NewsCard
                      article={article}
                      index={virtualRow.index}
                      isMobile={isMobile}
                      isNew={newIdsSet.has(article.id)}
                    />
                  </div>
                );
              })}
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
              <span className="font-medium">Live</span>
            </div>
            {backgroundLoad.isBackgroundLoading && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                Loading {backgroundLoad.loadedCount}
                {backgroundLoad.estimatedTotal
                  ? `/${backgroundLoad.estimatedTotal}`
                  : ""}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
