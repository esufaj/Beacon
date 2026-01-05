import { create } from "zustand";
import type { NewsArticle } from "@/types";

interface NewsState {
  articles: NewsArticle[];
  filteredArticles: NewsArticle[];
  selectedArticle: NewsArticle | null;
  selectedRegion: string | null;
  selectedLocationId: string | null;
  searchQuery: string;
  isLoading: boolean;

  setArticles: (articles: NewsArticle[]) => void;
  setSelectedArticle: (article: NewsArticle | null) => void;
  setSelectedRegion: (region: string | null) => void;
  setSelectedLocationId: (locationId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  filterByLocation: (locationId: string) => void;
  filterByRegion: (region: string) => void;
  clearFilters: () => void;
  getArticlesByLocation: (locationId: string) => NewsArticle[];
}

function normalizeLocationId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export const useNewsStore = create<NewsState>((set, get) => ({
  articles: [],
  filteredArticles: [],
  selectedArticle: null,
  selectedRegion: null,
  selectedLocationId: null,
  searchQuery: "",
  isLoading: true,

  setArticles: (articles) => {
    set({
      articles,
      filteredArticles: articles,
    });
  },

  setSelectedArticle: (article) => set({ selectedArticle: article }),

  setSelectedRegion: (region) => set({ selectedRegion: region }),

  setSelectedLocationId: (locationId) =>
    set({ selectedLocationId: locationId }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setSearchQuery: (query) => {
    const { articles } = get();
    const filtered = query
      ? articles.filter(
          (article) =>
            article.headline.toLowerCase().includes(query.toLowerCase()) ||
            article.summary.toLowerCase().includes(query.toLowerCase()) ||
            article.location.name.toLowerCase().includes(query.toLowerCase()) ||
            article.location.country
              .toLowerCase()
              .includes(query.toLowerCase()) ||
            article.category.toLowerCase().includes(query.toLowerCase())
        )
      : articles;
    set({ searchQuery: query, filteredArticles: filtered });
  },

  filterByLocation: (locationId) => {
    const { articles } = get();
    const normalizedId = normalizeLocationId(locationId);

    const filtered = articles.filter((article) => {
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
      searchQuery: "",
    });
  },

  filterByRegion: (region) => {
    const { articles } = get();
    const filtered = articles.filter(
      (article) => article.location.region === region
    );
    set({
      filteredArticles: filtered,
      selectedRegion: region,
      selectedLocationId: null,
      searchQuery: "",
    });
  },

  clearFilters: () => {
    const { articles } = get();
    set({
      filteredArticles: articles,
      selectedRegion: null,
      selectedLocationId: null,
      searchQuery: "",
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
}));
