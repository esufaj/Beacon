export type Category =
  | "politics"
  | "conflict"
  | "natural-disaster"
  | "economy"
  | "technology"
  | "health";

export interface Location {
  name: string;
  lat: number;
  lng: number;
  country: string;
  region: string;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  content: string;
  location: Location;
  category: Category;
  timestamp: Date;
  source: string;
  imageUrl?: string;
  url?: string;
}

export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  region: string;
  hasNews: boolean;
  newsCount: number;
}

export interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  politics: {
    label: "Politics",
    color: "#3B82F6",
    bgColor: "bg-blue-500/20",
  },
  conflict: {
    label: "Conflict",
    color: "#EF4444",
    bgColor: "bg-red-500/20",
  },
  "natural-disaster": {
    label: "Natural Disaster",
    color: "#F97316",
    bgColor: "bg-orange-500/20",
  },
  economy: {
    label: "Economy",
    color: "#22C55E",
    bgColor: "bg-green-500/20",
  },
  technology: {
    label: "Technology",
    color: "#8B5CF6",
    bgColor: "bg-purple-500/20",
  },
  health: {
    label: "Health",
    color: "#14B8A6",
    bgColor: "bg-teal-500/20",
  },
};

export interface RawArticle {
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  source: string;
  author: string | null;
  locationHint?: string;
}

export interface NewsSource {
  name: string;
  fetchHeadlines: () => Promise<RawArticle[]>;
  fetchByCategory?: (category: string) => Promise<RawArticle[]>;
}

export type BiasRating =
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right";

export type SourceCategory =
  | "mainstream"
  | "progressive"
  | "conservative"
  | "regional"
  | "business"
  | "tech"
  | "international";

export interface RssSource {
  id: number;
  name: string;
  feedUrl: string;
  websiteUrl: string | null;
  biasRating: BiasRating | null;
  category: SourceCategory | null;
  isActive: boolean;
  lastFetchedAt: Date | null;
  fetchError: string | null;
}

export interface RssArticle {
  id: string;
  sourceId: number | null;
  sourceName: string;
  sourceBias: BiasRating | null;
  sourceCategory: SourceCategory | null;
  guid: string | null;
  articleUrl: string;
  title: string;
  description: string | null;
  content: string | null;
  author: string | null;
  publishedAt: Date | null;
  imageUrl: string | null;
  aiProcessed: boolean;
  createdAt: Date;
}
