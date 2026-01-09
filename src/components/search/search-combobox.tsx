"use client";

import { useState, useMemo, useRef } from "react";
import { Search, MapPin, Tag, X, Globe2 } from "lucide-react";
import { useNewsStore } from "@/stores/news-store";
import { useGlobeStore } from "@/stores/globe-store";
import { WORLD_CITIES } from "@/data/world-cities";
import { CATEGORY_CONFIG, type Category, type GeoPoint } from "@/types";
import { cn } from "@/lib/utils";

const MAJOR_CITIES = WORLD_CITIES.filter(
  (c) => c.population > 1000000 || c.isCapital
)
  .sort((a, b) => b.population - a.population)
  .slice(0, 100);

export function SearchCombobox() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { setSearchQuery, filterByLocation, clearFilters, articles } =
    useNewsStore();
  const { setSelectedPoint, setAutoRotating, flyTo, resetView, projection } =
    useGlobeStore();

  // Get locations that have news
  const newsLocations = useMemo(() => {
    const locationMap = new Map<
      string,
      { count: number; lat: number; lng: number; region: string }
    >();

    for (const article of articles) {
      const key = article.location.name.toLowerCase();
      const existing = locationMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        locationMap.set(key, {
          count: 1,
          lat: article.location.lat,
          lng: article.location.lng,
          region: article.location.region,
        });
      }
    }

    return Array.from(locationMap.entries())
      .map(([name, data]) => ({
        id: name.replace(/\s+/g, "-"),
        name: name.charAt(0).toUpperCase() + name.slice(1),
        ...data,
      }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  const filteredLocations = useMemo(() => {
    if (!inputValue) {
      // Show locations with news first, then major cities
      const withNews = newsLocations.slice(0, 4);
      const majorCities = MAJOR_CITIES.filter(
        (c) =>
          !newsLocations.some(
            (n) => n.name.toLowerCase() === c.name.toLowerCase()
          )
      )
        .slice(0, 6 - withNews.length)
        .map((c) => ({
          id: c.name.toLowerCase().replace(/\s+/g, "-"),
          name: c.name,
          lat: c.lat,
          lng: c.lng,
          region: c.region,
          count: 0,
        }));
      return [...withNews, ...majorCities];
    }

    const query = inputValue.toLowerCase();

    // Search in news locations first
    const newsMatches = newsLocations
      .filter((loc) => loc.name.toLowerCase().includes(query))
      .slice(0, 3);

    // Then search in world cities
    const cityMatches = WORLD_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.country.toLowerCase().includes(query)
    )
      .filter(
        (c) =>
          !newsMatches.some(
            (n) => n.name.toLowerCase() === c.name.toLowerCase()
          )
      )
      .slice(0, 6 - newsMatches.length)
      .map((c) => ({
        id: c.name.toLowerCase().replace(/\s+/g, "-"),
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        region: c.region,
        count: 0,
        country: c.country,
      }));

    return [...newsMatches, ...cityMatches];
  }, [inputValue, newsLocations]);

  const categories = Object.entries(CATEGORY_CONFIG) as [
    Category,
    (typeof CATEGORY_CONFIG)[Category]
  ][];

  const handleLocationSelect = (location: (typeof filteredLocations)[0]) => {
    const point: GeoPoint = {
      id: location.id,
      lat: location.lat,
      lng: location.lng,
      name: location.name,
      region: location.region,
      hasNews: location.count > 0,
      newsCount: location.count,
    };

    setSelectedPoint(point);
    setAutoRotating(false);
    filterByLocation(location.id);
    flyTo(location.lat, location.lng, 1.5);
    setInputValue(location.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleCategorySelect = (category: Category) => {
    setSearchQuery(CATEGORY_CONFIG[category].label);
    setInputValue(CATEGORY_CONFIG[category].label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue("");
    clearFilters();
    setSelectedPoint(null);
    if (projection !== "mercator") {
      setAutoRotating(true);
    }
    resetView();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchQuery(value);
    if (!open && value) setOpen(true);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "flex items-center gap-2.5 h-9 px-3 rounded-lg",
          "bg-secondary/50 border border-border",
          "transition-all duration-200 ease-out",
          open && "border-ring bg-secondary"
        )}
      >
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search locations, topics..."
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={cn(
            "flex-1 bg-transparent text-sm text-[13px] text-foreground",
            "placeholder:text-muted-foreground",
            "outline-none border-none"
          )}
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 py-1.5 rounded-lg bg-popover border border-border shadow-lg z-50 max-h-[320px] overflow-y-auto custom-scrollbar animate-scale-in">
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
              Locations
            </span>
          </div>
          {filteredLocations.length === 0 ? (
            <div className="px-3 py-4 text-center text-muted-foreground text-[13px]">
              No locations found
            </div>
          ) : (
            filteredLocations.map((location) => (
              <button
                key={location.id}
                onMouseDown={() => handleLocationSelect(location)}
                className="w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md hover:bg-accent transition-colors text-left"
                style={{ width: "calc(100% - 12px)" }}
              >
                {location.count > 0 ? (
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  </div>
                ) : (
                  <Globe2 className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-[13px] font-medium text-foreground">
                  {location.name}
                </span>
                {"country" in location && (
                  <span className="text-[11px] text-muted-foreground">
                    {location.country as string}
                  </span>
                )}
                {location.count > 0 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 ml-auto tabular-nums">
                    {location.count}{" "}
                    {location.count === 1 ? "story" : "stories"}
                  </span>
                )}
                {location.count === 0 && (
                  <span className="text-[11px] text-muted-foreground/60 capitalize ml-auto">
                    {location.region.replace(/-/g, " ")}
                  </span>
                )}
              </button>
            ))
          )}

          <div className="h-px bg-border mx-3 my-1.5" />

          <div className="px-3 py-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Categories
            </span>
          </div>
          {categories.map(([key, config]) => (
            <button
              key={key}
              onMouseDown={() => handleCategorySelect(key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md hover:bg-accent transition-colors text-left"
            >
              <Tag className="w-3.5 h-3.5" style={{ color: config.color }} />
              <span className="text-[13px] font-medium text-foreground">
                {config.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
