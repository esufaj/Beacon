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
  dateRange: { start: string | null; end: string | null };
}

interface NewsState {
  articles: NewsArticle[];
  filteredArticles: NewsArticle[];
  articleIndex: Map<string, NewsArticle>;
  orderedArticleIds: string[];
  positionMap: Map<string, number>;
  selectedArticle: NewsArticle | null;
  selectedRegion: string | null;
  selectedLocationId: string | null;
  lastKnownMaxPublishedAt: string | null;
  realtimeConnected: boolean;
  backgroundLoad: {
    isBackgroundLoading: boolean;
    loadedCount: number;
    estimatedTotal: number | null;
    hasMore: boolean;
    nextOffset: number | null;
    failedBatches: number;
  };
  newArticleIds: Set<string>;
  searchQuery: string;
  isLoading: boolean;
  filters: FilterState;

  categoryIndex: Map<string, Set<string>>;
  sourceIndex: Map<string, Set<string>>;
  sentimentIndex: Map<string, Set<string>>;
  urgencyIndex: Map<string, Set<string>>;
  biasIndex: Map<string, Set<string>>;

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
  setRealtimeConnected: (connected: boolean) => void;
  setBackgroundLoad: (
    backgroundLoad: Partial<NewsState["backgroundLoad"]>
  ) => void;
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
  articleIndex: Map<string, NewsArticle>,
  article: NewsArticle
): number {
  const targetTime = article.timestamp.getTime();
  let low = 0;
  let high = orderedIds.length;

  while (low < high) {
    const mid = (low + high) >> 1;
    const midArticle = articleIndex.get(orderedIds[mid]);
    const midTime = midArticle?.timestamp.getTime() ?? 0;

    if (midTime < targetTime) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

function addToFilterIndex(index: Map<string, Set<string>>, key: string | null | undefined, id: string) {
  if (!key) return;
  let s = index.get(key);
  if (!s) {
    s = new Set();
    index.set(key, s);
  }
  s.add(id);
}

function removeFromFilterIndex(index: Map<string, Set<string>>, key: string | null | undefined, id: string) {
  if (!key) return;
  const s = index.get(key);
  if (s) {
    s.delete(id);
    if (s.size === 0) index.delete(key);
  }
}

function rebuildPositionMap(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < ids.length; i++) {
    m.set(ids[i], i);
  }
  return m;
}

function applyArticleMutation(
  state: {
    articleIndex: Map<string, NewsArticle>;
    orderedArticleIds: string[];
    positionMap: Map<string, number>;
    newArticleIds: Set<string>;
    categoryIndex: Map<string, Set<string>>;
    sourceIndex: Map<string, Set<string>>;
    sentimentIndex: Map<string, Set<string>>;
    urgencyIndex: Map<string, Set<string>>;
    biasIndex: Map<string, Set<string>>;
  },
  incomingArticles: NewsArticle[],
  markAsNew: boolean,
) {
  const articleIndex = new Map(state.articleIndex);
  const newArticleIds = new Set(state.newArticleIds);

  const idsToRemove = new Set<string>();
  const normalized: NewsArticle[] = [];

  for (const rawArticle of incomingArticles) {
    const article = normalizeArticle(rawArticle);
    const existing = articleIndex.get(article.id);

    if (existing) {
      idsToRemove.add(article.id);
      removeFromFilterIndex(state.categoryIndex, existing.category, article.id);
      removeFromFilterIndex(state.sourceIndex, existing.source, article.id);
      removeFromFilterIndex(state.sentimentIndex, existing.sentiment, article.id);
      removeFromFilterIndex(state.urgencyIndex, existing.urgency, article.id);
      removeFromFilterIndex(state.biasIndex, existing.biasRating, article.id);
    }

    articleIndex.set(article.id, article);
    normalized.push(article);

    addToFilterIndex(state.categoryIndex, article.category, article.id);
    addToFilterIndex(state.sourceIndex, article.source, article.id);
    addToFilterIndex(state.sentimentIndex, article.sentiment, article.id);
    addToFilterIndex(state.urgencyIndex, article.urgency, article.id);
    addToFilterIndex(state.biasIndex, article.biasRating, article.id);

    if (markAsNew) {
      newArticleIds.add(article.id);
    }
  }

  let orderedArticleIds: string[];
  if (idsToRemove.size > 0) {
    orderedArticleIds = state.orderedArticleIds.filter(
      (id) => !idsToRemove.has(id),
    );
  } else {
    orderedArticleIds = [...state.orderedArticleIds];
  }

  for (const article of normalized) {
    const insertIndex = findInsertIndex(
      orderedArticleIds,
      articleIndex,
      article,
    );
    orderedArticleIds.splice(insertIndex, 0, article.id);
  }

  const positionMap = rebuildPositionMap(orderedArticleIds);

  const articles = orderedArticleIds
    .map((id) => articleIndex.get(id))
    .filter((a): a is NewsArticle => a !== undefined);

  if (newArticleIds.size > 200) {
    const keep = [...newArticleIds].slice(-100);
    newArticleIds.clear();
    for (const id of keep) newArticleIds.add(id);
  }

  return {
    articleIndex,
    orderedArticleIds,
    positionMap,
    newArticleIds,
    articles,
    categoryIndex: state.categoryIndex,
    sourceIndex: state.sourceIndex,
    sentimentIndex: state.sentimentIndex,
    urgencyIndex: state.urgencyIndex,
    biasIndex: state.biasIndex,
  };
}

function collectIdsFromIndex(
  index: Map<string, Set<string>>,
  keys: string[],
): Set<string> | null {
  if (keys.length === 0) return null;
  const result = new Set<string>();
  for (const key of keys) {
    const ids = index.get(key);
    if (ids) {
      for (const id of ids) result.add(id);
    }
  }
  return result;
}

function intersectSets(a: Set<string>, b: Set<string>): Set<string> {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  const result = new Set<string>();
  for (const id of smaller) {
    if (larger.has(id)) result.add(id);
  }
  return result;
}

function applyFilters(
  articles: NewsArticle[],
  filters: FilterState,
  searchQuery: string,
  indexes: {
    categoryIndex: Map<string, Set<string>>;
    sourceIndex: Map<string, Set<string>>;
    sentimentIndex: Map<string, Set<string>>;
    urgencyIndex: Map<string, Set<string>>;
    biasIndex: Map<string, Set<string>>;
  },
): NewsArticle[] {
  const hasIndexFilters =
    filters.categories.length > 0 ||
    filters.sources.length > 0 ||
    filters.sentiments.length > 0 ||
    filters.urgencies.length > 0 ||
    filters.biasRatings.length > 0;

  let candidateIds: Set<string> | null = null;

  if (hasIndexFilters) {
    const sets: Set<string>[] = [];
    const catIds = collectIdsFromIndex(indexes.categoryIndex, filters.categories);
    if (catIds) sets.push(catIds);
    const srcIds = collectIdsFromIndex(indexes.sourceIndex, filters.sources);
    if (srcIds) sets.push(srcIds);
    const senIds = collectIdsFromIndex(indexes.sentimentIndex, filters.sentiments);
    if (senIds) sets.push(senIds);
    const urgIds = collectIdsFromIndex(indexes.urgencyIndex, filters.urgencies);
    if (urgIds) sets.push(urgIds);
    const biasIds = collectIdsFromIndex(indexes.biasIndex, filters.biasRatings);
    if (biasIds) sets.push(biasIds);

    if (sets.length > 0) {
      sets.sort((a, b) => a.size - b.size);
      candidateIds = sets[0];
      for (let i = 1; i < sets.length; i++) {
        candidateIds = intersectSets(candidateIds, sets[i]);
      }
    }
  }

  let filtered = candidateIds
    ? articles.filter((a) => candidateIds!.has(a.id))
    : articles;

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((article) => {
      if (article.headline.toLowerCase().includes(query)) return true;
      if (article.summary.toLowerCase().includes(query)) return true;
      if (article.content.toLowerCase().includes(query)) return true;
      if (article.source.toLowerCase().includes(query)) return true;
      if (article.category.toLowerCase().includes(query)) return true;
      if (article.keywords?.some((k) => k.toLowerCase().includes(query)))
        return true;
      if (article.entitiesPeople?.some((p) => p.toLowerCase().includes(query)))
        return true;
      if (
        article.entitiesOrganizations?.some((o) =>
          o.toLowerCase().includes(query),
        )
      )
        return true;
      return false;
    });
  }

  if (filters.locations.length > 0) {
    const locSet = new Set(filters.locations);
    filtered = filtered.filter((a) => {
      const locationKey = getLocationKey(a.location);
      return locationKey ? locSet.has(locationKey) : false;
    });
  }

  if (filters.dateRange.start) {
    const startMs = new Date(filters.dateRange.start).getTime();
    filtered = filtered.filter((a) => a.timestamp.getTime() >= startMs);
  }

  if (filters.dateRange.end) {
    const endMs = new Date(filters.dateRange.end).getTime();
    filtered = filtered.filter((a) => a.timestamp.getTime() <= endMs);
  }

  return filtered;
}

export const useNewsStore = create<NewsState>((set, get) => ({
  articles: [],
  filteredArticles: [],
  articleIndex: new Map(),
  orderedArticleIds: [],
  positionMap: new Map(),
  selectedArticle: null,
  selectedRegion: null,
  selectedLocationId: null,
  lastKnownMaxPublishedAt: null,
  realtimeConnected: false,
  backgroundLoad: {
    isBackgroundLoading: false,
    loadedCount: 0,
    estimatedTotal: null,
    hasMore: false,
    nextOffset: null,
    failedBatches: 0,
  },
  newArticleIds: new Set(),
  searchQuery: "",
  isLoading: true,
  filters: defaultFilters,

  categoryIndex: new Map(),
  sourceIndex: new Map(),
  sentimentIndex: new Map(),
  urgencyIndex: new Map(),
  biasIndex: new Map(),

  setArticles: (articles) => {
    const { filters, searchQuery } = get();
    const emptyState = {
      articleIndex: new Map<string, NewsArticle>(),
      orderedArticleIds: [] as string[],
      positionMap: new Map<string, number>(),
      newArticleIds: new Set<string>(),
      categoryIndex: new Map<string, Set<string>>(),
      sourceIndex: new Map<string, Set<string>>(),
      sentimentIndex: new Map<string, Set<string>>(),
      urgencyIndex: new Map<string, Set<string>>(),
      biasIndex: new Map<string, Set<string>>(),
    };
    const next = applyArticleMutation(emptyState, articles, false);
    const lastKnownMaxPublishedAt = next.articles[0]
      ? next.articles[0].timestamp.toISOString()
      : null;
    set({
      ...next,
      filteredArticles: applyFilters(next.articles, filters, searchQuery, next),
      lastKnownMaxPublishedAt,
      backgroundLoad: {
        ...get().backgroundLoad,
        loadedCount: next.articles.length,
      },
    });
  },

  upsertArticles: (incoming, options) => {
    if (incoming.length === 0) return;
    const state = get();
    const next = applyArticleMutation(
      {
        articleIndex: state.articleIndex,
        orderedArticleIds: state.orderedArticleIds,
        positionMap: state.positionMap,
        newArticleIds: state.newArticleIds,
        categoryIndex: state.categoryIndex,
        sourceIndex: state.sourceIndex,
        sentimentIndex: state.sentimentIndex,
        urgencyIndex: state.urgencyIndex,
        biasIndex: state.biasIndex,
      },
      incoming,
      options?.markAsNew ?? false,
    );
    const latestTimestamp = next.articles[0]
      ? next.articles[0].timestamp.toISOString()
      : null;
    set({
      ...next,
      filteredArticles: applyFilters(next.articles, state.filters, state.searchQuery, next),
      lastKnownMaxPublishedAt: latestTimestamp ?? state.lastKnownMaxPublishedAt,
      backgroundLoad: {
        ...state.backgroundLoad,
        loadedCount: next.articles.length,
      },
    });
  },

  upsertArticle: (article, options) => {
    get().upsertArticles([article], options);
  },

  setSelectedArticle: (article) => set({ selectedArticle: article }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSelectedLocationId: (locationId) => set({ selectedLocationId: locationId }),
  setLastKnownMaxPublishedAt: (timestamp) => set({ lastKnownMaxPublishedAt: timestamp }),
  setRealtimeConnected: (connected) => set({ realtimeConnected: connected }),

  setBackgroundLoad: (backgroundLoad) =>
    set((state) => ({
      backgroundLoad: { ...state.backgroundLoad, ...backgroundLoad },
    })),

  clearNewArticleFlags: () => set({ newArticleIds: new Set() }),

  removeNewArticleFlag: (articleId) =>
    set((state) => {
      const next = new Set(state.newArticleIds);
      next.delete(articleId);
      return { newArticleIds: next };
    }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setSearchQuery: (query) => {
    const state = get();
    set({
      searchQuery: query,
      filteredArticles: applyFilters(state.articles, state.filters, query, state),
    });
  },

  setFilters: (newFilters) => {
    const state = get();
    const updatedFilters = { ...state.filters, ...newFilters };
    set({
      filters: updatedFilters,
      filteredArticles: applyFilters(state.articles, updatedFilters, state.searchQuery, state),
    });
  },

  filterByLocation: (locationId) => {
    const state = get();
    const { articles, filters, searchQuery } = state;
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
      filteredArticles: applyFilters(articles, updatedFilters, searchQuery, state),
      selectedLocationId: null,
      selectedRegion: null,
    });
  },

  filterByRegion: (region) => {
    const state = get();
    const { articles, filters, searchQuery } = state;
    const filtered = applyFilters(articles, filters, searchQuery, state).filter(
      (article) => article.location.region === region,
    );
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

  clearLocationSelection: () => {
    const state = get();
    const updatedFilters = { ...state.filters, locations: [] };
    set({
      filters: updatedFilters,
      filteredArticles: applyFilters(state.articles, updatedFilters, state.searchQuery, state),
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
    const { sourceIndex } = get();
    return [...sourceIndex.keys()].sort();
  },

  getUniqueLocations: () => {
    const { articles } = get();
    const locationMap = new Map<string, number>();

    for (const article of articles) {
      const key = getLocationKey(article.location);
      if (!key) continue;
      locationMap.set(key, (locationMap.get(key) || 0) + 1);
    }

    return Array.from(locationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([location]) => location);
  },
}));
