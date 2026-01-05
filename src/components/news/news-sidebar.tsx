"use client";

import { Globe2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNewsStore } from "@/stores/news-store";
import { useGlobeStore } from "@/stores/globe-store";
import { useUIStore } from "@/stores/ui-store";
import { NewsCard } from "./news-card";
import { SearchCombobox } from "@/components/search/search-combobox";
import { BeaconLogo } from "@/components/beacon-logo";
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

  const { selectedPoint, setSelectedPoint, setAutoRotating, resetView } = useGlobeStore();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  const hasActiveFilter = selectedLocationId || selectedRegion;

  const handleClearFilter = () => {
    clearFilters();
    setSelectedPoint(null);
    setAutoRotating(true);
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
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={handleCloseSidebar}
        />
      )}
      
      <aside className={cn(
        "w-[340px] h-screen flex flex-col bg-neutral-950/95 backdrop-blur-xl border-r border-white/5",
        "fixed lg:relative z-50",
        "transition-transform duration-300 ease-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BeaconLogo />
              <h1 className="text-lg font-bold tracking-tight text-white">Beacon</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseSidebar}
              className="h-8 w-8 lg:hidden hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <SearchCombobox />

          {hasActiveFilter && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Globe2 className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-neutral-400">Filtering:</span>
                <span className="text-white font-bold">
                  {selectedPoint?.name || selectedRegion || selectedLocationId}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilter}
                className="h-6 px-2 text-xs text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>

        <Separator className="bg-white/5" />

        <div className="px-4 py-2 flex items-center justify-between flex-shrink-0 bg-neutral-900/50">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Latest Stories
          </h2>
          <span className="text-[10px] font-semibold text-neutral-500">
            {filteredArticles.length} stories
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading && filteredArticles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Loader2 className="w-8 h-8 text-blue-500 mb-3 animate-spin" />
              <p className="text-neutral-400 text-sm font-medium">
                Loading stories...
              </p>
              <p className="text-neutral-600 text-xs mt-1">
                Fetching latest news from around the world
              </p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Globe2 className="w-10 h-10 text-neutral-700 mb-3" />
              <p className="text-neutral-500 text-xs font-medium">
                No stories found for this location
              </p>
              <Button
                variant="link"
                onClick={handleClearFilter}
                className="mt-1 text-blue-400 hover:text-blue-300 font-semibold text-xs h-auto p-0"
              >
                View all stories
              </Button>
            </div>
          ) : (
            filteredArticles.map((article, index) => (
              <NewsCard
                key={article.id}
                article={article}
                index={index}
                isLast={index === filteredArticles.length - 1}
              />
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between text-[10px] text-neutral-500">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">Live updates</span>
            </div>
            <span className="text-neutral-600">
              Refreshes every {Math.round(POLL_INTERVAL_MS / 60000)} min
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
