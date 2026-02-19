import { create } from "zustand";
import type { NewsArticle, Category, BiasRating, Sentiment, Urgency } from "@/types";

export interface FilterState {
  sources: string[];
  categories: Category[];
  biasRatings: BiasRating[];
  sentiments: Sentiment[];
  urgencies: Urgency[];
  locations: string[];
  dateRange: { start: Date | null; end: Date | null };
}

interface NewsState {
  articles: NewsArticle[];
  filteredArticles: NewsArticle[];
  selectedArticle: NewsArticle | null;
  selectedRegion: string | null;
  selectedLocationId: string | null;
  searchQuery: string;
  isLoading: boolean;
  filters: FilterState;

  setArticles: (articles: NewsArticle[]) => void;
  setSelectedArticle: (article: NewsArticle | null) => void;
  setSelectedRegion: (region: string | null) => void;
  setSelectedLocationId: (locationId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  filterByLocation: (locationId: string) => void;
  filterByRegion: (region: string) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  clearLocationSelection: () => void;
  getArticlesByLocation: (locationId: string) => NewsArticle[];
  getUniqueSources: () => string[];
  getUniqueLocations: () => string[];
}

function normalizeLocationId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const defaultFilters: FilterState = {
  sources: [],
  categories: [],
  biasRatings: [],
  sentiments: [],
  urgencies: [],
  locations: [],
  dateRange: { start: null, end: null },
};

function applyFilters(articles: NewsArticle[], filters: FilterState, searchQuery: string): NewsArticle[] {
  let filtered = articles;

  // Comprehensive text search - searches article content, not locations
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((article) => {
      // Search in primary fields
      if (article.headline.toLowerCase().includes(query)) return true;
      if (article.summary.toLowerCase().includes(query)) return true;
      if (article.content.toLowerCase().includes(query)) return true;
      if (article.source.toLowerCase().includes(query)) return true;
      if (article.category.toLowerCase().includes(query)) return true;
      
      // Search in keywords
      if (article.keywords?.some(k => k.toLowerCase().includes(query))) return true;
      
      // Search in entities (people and organizations)
      if (article.entitiesPeople?.some(p => p.toLowerCase().includes(query))) return true;
      if (article.entitiesOrganizations?.some(o => o.toLowerCase().includes(query))) return true;
      
      return false;
    });
  }

  if (filters.sources.length > 0) {
    filtered = filtered.filter((a) => filters.sources.includes(a.source));
  }

  if (filters.categories.length > 0) {
    filtered = filtered.filter((a) => filters.categories.includes(a.category));
  }

  if (filters.biasRatings.length > 0) {
    filtered = filtered.filter((a) => a.biasRating && filters.biasRatings.includes(a.biasRating));
  }

  if (filters.sentiments.length > 0) {
    filtered = filtered.filter((a) => a.sentiment && filters.sentiments.includes(a.sentiment));
  }

  if (filters.urgencies.length > 0) {
    filtered = filtered.filter((a) => a.urgency && filters.urgencies.includes(a.urgency));
  }

  // Location filter
  if (filters.locations.length > 0) {
    filtered = filtered.filter((a) => {
      const locationKey = `${a.location.name}, ${a.location.country}`;
      return filters.locations.includes(locationKey);
    });
  }

  if (filters.dateRange.start) {
    filtered = filtered.filter((a) => a.timestamp >= filters.dateRange.start!);
  }

  if (filters.dateRange.end) {
    filtered = filtered.filter((a) => a.timestamp <= filters.dateRange.end!);
  }

  return filtered;
}

export const useNewsStore = create<NewsState>((set, get) => ({
  articles: [],
  filteredArticles: [],
  selectedArticle: null,
  selectedRegion: null,
  selectedLocationId: null,
  searchQuery: "",
  isLoading: true,
  filters: defaultFilters,

  setArticles: (articles) => {
    const { filters, searchQuery } = get();
    set({
      articles,
      filteredArticles: applyFilters(articles, filters, searchQuery),
    });
  },

  setSelectedArticle: (article) => set({ selectedArticle: article }),

  setSelectedRegion: (region) => set({ selectedRegion: region }),

  setSelectedLocationId: (locationId) =>
    set({ selectedLocationId: locationId }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setSearchQuery: (query) => {
    const { articles, filters } = get();
    set({
      searchQuery: query,
      filteredArticles: applyFilters(articles, filters, query),
    });
  },

  setFilters: (newFilters) => {
    const { articles, filters, searchQuery } = get();
    const updatedFilters = { ...filters, ...newFilters };
    set({
      filters: updatedFilters,
      filteredArticles: applyFilters(articles, updatedFilters, searchQuery),
    });
  },

  filterByLocation: (locationId) => {
    const { articles, filters, searchQuery } = get();
    const normalizedId = normalizeLocationId(locationId);

    let filtered = applyFilters(articles, filters, searchQuery);
    filtered = filtered.filter((article) => {
      const articleLocationId = normalizeLocationId(article.location.name);
      return (
        articleLocationId === normalizedId ||
        article.location.name.toLowerCase() === locationId.toLowerCase()
      );
    });

    set({
      filteredArticles: filtered,
      selectedLocationId: locationId,
      selectedRegion: null,
    });
  },

  filterByRegion: (region) => {
    const { articles, filters, searchQuery } = get();
    let filtered = applyFilters(articles, filters, searchQuery);
    filtered = filtered.filter((article) => article.location.region === region);
    set({
      filteredArticles: filtered,
      selectedRegion: region,
      selectedLocationId: null,
    });
  },

  clearFilters: () => {
    const { articles } = get();
    set({
      filteredArticles: articles,
      selectedRegion: null,
      selectedLocationId: null,
      searchQuery: "",
      filters: defaultFilters,
    });
  },

  // Clear only location-based selections (keeps filter panel filters intact)
  clearLocationSelection: () => {
    const { articles, filters, searchQuery } = get();
    set({
      filteredArticles: applyFilters(articles, filters, searchQuery),
      selectedRegion: null,
      selectedLocationId: null,
    });
  },

  getArticlesByLocation: (locationId) => {
    const { articles } = get();
    const normalizedId = normalizeLocationId(locationId);

    return articles.filter((article) => {
      const articleLocationId = normalizeLocationId(article.location.name);
      return articleLocationId === normalizedId;
    });
  },

  getUniqueSources: () => {
    const { articles } = get();
    return [...new Set(articles.map((a) => a.source))].sort();
  },

  getUniqueLocations: () => {
    const { articles } = get();
    const locationMap = new Map<string, number>();
    
    for (const article of articles) {
      const key = `${article.location.name}, ${article.location.country}`;
      locationMap.set(key, (locationMap.get(key) || 0) + 1);
    }
    
    // Sort by count (most articles first)
    return Array.from(locationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([location]) => location);
  },
}));
