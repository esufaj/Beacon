import { create } from "zustand";
import type { NewsArticle, Category, BiasRating, Sentiment, Urgency } from "@/types";
import { getLocationKey } from "@/lib/location-utils";

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
  articleIndex: Record<string, NewsArticle>;
  orderedArticleIds: string[];
  selectedArticle: NewsArticle | null;
  selectedRegion: string | null;
  selectedLocationId: string | null;
  lastKnownMaxPublishedAt: string | null;
  backgroundLoad: {
    isBackgroundLoading: boolean;
    loadedCount: number;
    estimatedTotal: number | null;
    hasMore: boolean;
    nextOffset: number | null;
    failedBatches: number;
  };
  manualLoadMoreTick: number;
  newArticleIds: string[];
  searchQuery: string;
  isLoading: boolean;
  filters: FilterState;

  setArticles: (articles: NewsArticle[]) => void;
  upsertArticles: (
    articles: NewsArticle[],
    options?: { markAsNew?: boolean }
  ) => void;
  upsertArticle: (
    article: NewsArticle,
    options?: { markAsNew?: boolean }
  ) => void;
  setSelectedArticle: (article: NewsArticle | null) => void;
  setSelectedRegion: (region: string | null) => void;
  setSelectedLocationId: (locationId: string | null) => void;
  setLastKnownMaxPublishedAt: (timestamp: string | null) => void;
  setBackgroundLoad: (
    backgroundLoad: Partial<NewsState["backgroundLoad"]>
  ) => void;
  requestLoadMore: () => void;
  clearNewArticleFlags: () => void;
  removeNewArticleFlag: (articleId: string) => void;
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

function normalizeArticle(article: NewsArticle): NewsArticle {
  return {
    ...article,
    timestamp:
      article.timestamp instanceof Date
        ? article.timestamp
        : new Date(article.timestamp),
  };
}

function findInsertIndex(
  orderedIds: string[],
  articleIndex: Record<string, NewsArticle>,
  article: NewsArticle
): number {
  const targetTime = article.timestamp.getTime();
  let low = 0;
  let high = orderedIds.length;

  while (low < high) {
    const mid = (low + high) >> 1;
    const midArticle = articleIndex[orderedIds[mid]];
    const midTime = midArticle?.timestamp.getTime() ?? 0;

    if (midTime < targetTime) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

function applyArticleMutation(
  state: Pick<NewsState, "articleIndex" | "orderedArticleIds" | "newArticleIds">,
  incomingArticles: NewsArticle[],
  markAsNew: boolean
) {
  const articleIndex = { ...state.articleIndex };
  const orderedArticleIds = [...state.orderedArticleIds];
  const newArticleIdsSet = new Set(state.newArticleIds);

  for (const rawArticle of incomingArticles) {
    const article = normalizeArticle(rawArticle);
    const existing = articleIndex[article.id];
    if (existing) {
      const existingIndex = orderedArticleIds.indexOf(article.id);
      if (existingIndex >= 0) {
        orderedArticleIds.splice(existingIndex, 1);
      }
    }

    articleIndex[article.id] = article;
    const insertIndex = findInsertIndex(orderedArticleIds, articleIndex, article);
    orderedArticleIds.splice(insertIndex, 0, article.id);

    if (markAsNew) {
      newArticleIdsSet.add(article.id);
    }
  }

  const articles = orderedArticleIds.map((id) => articleIndex[id]).filter(Boolean);
  return {
    articleIndex,
    orderedArticleIds,
    newArticleIds: Array.from(newArticleIdsSet).slice(-100),
    articles,
  };
}

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
      const locationKey = getLocationKey(a.location);
      return locationKey ? filters.locations.includes(locationKey) : false;
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
  articleIndex: {},
  orderedArticleIds: [],
  selectedArticle: null,
  selectedRegion: null,
  selectedLocationId: null,
  lastKnownMaxPublishedAt: null,
  backgroundLoad: {
    isBackgroundLoading: false,
    loadedCount: 0,
    estimatedTotal: null,
    hasMore: false,
    nextOffset: null,
    failedBatches: 0,
  },
  manualLoadMoreTick: 0,
  newArticleIds: [],
  searchQuery: "",
  isLoading: true,
  filters: defaultFilters,

  setArticles: (articles) => {
    const { filters, searchQuery } = get();
    const baseState = applyArticleMutation(
      { articleIndex: {}, orderedArticleIds: [], newArticleIds: [] },
      articles,
      false
    );
    const lastKnownMaxPublishedAt = baseState.articles[0]
      ? baseState.articles[0].timestamp.toISOString()
      : null;
    set({
      articleIndex: baseState.articleIndex,
      orderedArticleIds: baseState.orderedArticleIds,
      newArticleIds: baseState.newArticleIds,
      articles: baseState.articles,
      filteredArticles: applyFilters(baseState.articles, filters, searchQuery),
      lastKnownMaxPublishedAt,
      backgroundLoad: {
        ...get().backgroundLoad,
        loadedCount: baseState.articles.length,
      },
    });
  },

  upsertArticles: (incoming, options) => {
    if (incoming.length === 0) return;
    const { filters, searchQuery, articleIndex, orderedArticleIds, newArticleIds } = get();
    const next = applyArticleMutation(
      { articleIndex, orderedArticleIds, newArticleIds },
      incoming,
      options?.markAsNew ?? false
    );
    const latestTimestamp = next.articles[0]
      ? next.articles[0].timestamp.toISOString()
      : null;
    set({
      articleIndex: next.articleIndex,
      orderedArticleIds: next.orderedArticleIds,
      newArticleIds: next.newArticleIds,
      articles: next.articles,
      filteredArticles: applyFilters(next.articles, filters, searchQuery),
      lastKnownMaxPublishedAt: latestTimestamp ?? get().lastKnownMaxPublishedAt,
      backgroundLoad: {
        ...get().backgroundLoad,
        loadedCount: next.articles.length,
      },
    });
  },

  upsertArticle: (article, options) => {
    get().upsertArticles([article], options);
  },

  setSelectedArticle: (article) => set({ selectedArticle: article }),

  setSelectedRegion: (region) => set({ selectedRegion: region }),

  setSelectedLocationId: (locationId) =>
    set({ selectedLocationId: locationId }),

  setLastKnownMaxPublishedAt: (timestamp) =>
    set({ lastKnownMaxPublishedAt: timestamp }),

  setBackgroundLoad: (backgroundLoad) =>
    set((state) => ({
      backgroundLoad: {
        ...state.backgroundLoad,
        ...backgroundLoad,
      },
    })),

  requestLoadMore: () =>
    set((state) => ({ manualLoadMoreTick: state.manualLoadMoreTick + 1 })),

  clearNewArticleFlags: () => set({ newArticleIds: [] }),

  removeNewArticleFlag: (articleId) =>
    set((state) => ({
      newArticleIds: state.newArticleIds.filter((id) => id !== articleId),
    })),

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
    const matchedLocationKeys = new Set<string>();

    for (const article of articles) {
      const articleLocationId = normalizeLocationId(article.location.name);
      const isMatch =
        articleLocationId === normalizedId ||
        article.location.name.toLowerCase() === locationId.toLowerCase();

      if (!isMatch) continue;

      const locationKey = getLocationKey(article.location);
      if (locationKey) {
        matchedLocationKeys.add(locationKey);
      }
    }

    if (matchedLocationKeys.size === 0 && locationId.trim().length > 0) {
      matchedLocationKeys.add(locationId);
    }

    const updatedFilters = {
      ...filters,
      locations: Array.from(new Set([...filters.locations, ...matchedLocationKeys])),
    };

    set({
      filters: updatedFilters,
      filteredArticles: applyFilters(articles, updatedFilters, searchQuery),
      selectedLocationId: null,
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
    const updatedFilters = { ...filters, locations: [] };
    set({
      filters: updatedFilters,
      filteredArticles: applyFilters(articles, updatedFilters, searchQuery),
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
      const key = getLocationKey(article.location);
      if (!key) continue;
      locationMap.set(key, (locationMap.get(key) || 0) + 1);
    }
    
    // Sort by count (most articles first)
    return Array.from(locationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([location]) => location);
  },
}));
