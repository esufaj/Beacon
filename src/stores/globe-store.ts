import { create } from "zustand";
import type { GeoPoint, NewsArticle } from "@/types";
import { getCitiesWithNews } from "@/data/world-cities";
import type { MapRef } from "react-map-gl/maplibre";

type ResetViewCallback = () => void;
type FlyToCallback = (lat: number, lng: number, zoom?: number) => void;
type FastSpinCallback = () => void;

export interface LayerVisibility {
  labels: boolean;
  borders: boolean;
}

export type ProjectionType = "globe" | "mercator";

interface GlobeState {
  points: GeoPoint[];
  hoveredPoint: GeoPoint | null;
  selectedPoint: GeoPoint | null;
  isAutoRotating: boolean;
  zoomLevel: number;
  resetViewCallback: ResetViewCallback | null;
  flyToCallback: FlyToCallback | null;
  fastSpinCallback: FastSpinCallback | null;
  layers: LayerVisibility;
  mapRef: MapRef | null;
  projection: ProjectionType;

  setHoveredPoint: (point: GeoPoint | null) => void;
  setSelectedPoint: (point: GeoPoint | null) => void;
  setAutoRotating: (isRotating: boolean) => void;
  setZoomLevel: (level: number) => void;
  initializePoints: (articles?: NewsArticle[]) => void;
  registerResetCallback: (callback: ResetViewCallback) => void;
  registerFlyToCallback: (callback: FlyToCallback) => void;
  setFastSpinCallback: (callback: FastSpinCallback) => void;
  triggerFastSpinReset: () => void;
  resetView: () => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setMapRef: (ref: MapRef | null) => void;
  setProjection: (projection: ProjectionType) => void;
  toggleProjection: () => void;
}

function createPointId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function getBasePoints(): GeoPoint[] {
  return getCitiesWithNews().map((city) => ({
    id: createPointId(city.name),
    lat: city.lat,
    lng: city.lng,
    name: city.name,
    region: city.region,
    hasNews: false,
    newsCount: 0,
  }));
}

const getDefaultZoom = (width: number): number => {
  if (width >= 1920) return 2.2;
  if (width >= 1440) return 2.0;
  if (width >= 1024) return 1.8;
  return 1.5;
};

export const useGlobeStore = create<GlobeState>((set, get) => ({
  points: getBasePoints(),
  hoveredPoint: null,
  selectedPoint: null,
  isAutoRotating: true,
  zoomLevel: 1.5,
  resetViewCallback: null,
  flyToCallback: null,
  fastSpinCallback: null,
  layers: {
    labels: true,
    borders: true,
  },
  mapRef: null,
  projection: "globe",

  setHoveredPoint: (point) => set({ hoveredPoint: point }),

  setSelectedPoint: (point) => set({ selectedPoint: point }),

  setAutoRotating: (isRotating) => set({ isAutoRotating: isRotating }),

  setZoomLevel: (level) => set({ zoomLevel: level }),

  registerResetCallback: (callback) => set({ resetViewCallback: callback }),

  registerFlyToCallback: (callback) => set({ flyToCallback: callback }),

  setFastSpinCallback: (callback) => set({ fastSpinCallback: callback }),

  triggerFastSpinReset: () => {
    const { fastSpinCallback, mapRef, projection } = get();
    const defaultZoom = getDefaultZoom(
      typeof window !== "undefined" ? window.innerWidth : 1024
    );

    set({ selectedPoint: null });

    if (mapRef) {
      mapRef.flyTo({
        center: [0, 20],
        zoom: defaultZoom,
        pitch: 0,
        bearing: 0,
        duration: 1200,
      });
    }

    if (projection === "mercator") {
      return;
    }

    if (fastSpinCallback) {
      fastSpinCallback();
    } else {
      set({ isAutoRotating: true });
    }
  },

  resetView: () => {
    const { resetViewCallback, mapRef, projection } = get();
    const defaultZoom = getDefaultZoom(
      typeof window !== "undefined" ? window.innerWidth : 1024
    );

    if (resetViewCallback) {
      resetViewCallback();
    }
    if (mapRef) {
      mapRef.flyTo({
        center: [0, 20],
        zoom: defaultZoom,
        pitch: 0,
        bearing: 0,
        duration: 1500,
      });
    }
    if (projection === "mercator") {
      set({ selectedPoint: null });
    } else {
      set({ selectedPoint: null, isAutoRotating: true });
    }
  },

  flyTo: (lat, lng, zoom = 5) => {
    const { flyToCallback, mapRef } = get();
    if (flyToCallback) {
      flyToCallback(lat, lng, zoom);
    }
    if (mapRef) {
      mapRef.flyTo({
        center: [lng, lat],
        zoom,
        duration: 1500,
      });
    }
  },

  toggleLayer: (layer) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layer]: !state.layers[layer],
      },
    })),

  setMapRef: (ref) => set({ mapRef: ref }),

  setProjection: (projection) => set({ projection }),

  toggleProjection: () => {
    const { projection, mapRef } = get();
    const newProjection = projection === "globe" ? "mercator" : "globe";

    if (newProjection === "mercator") {
      set({ projection: newProjection, isAutoRotating: false });
    } else {
      set({ projection: newProjection });
    }

    if (mapRef) {
      const map = mapRef.getMap();
      try {
        map.setProjection({ type: newProjection });
      } catch (error) {
        console.warn("Failed to set projection:", error);
      }
    }
  },

  initializePoints: (articles?: NewsArticle[]) => {
    const basePoints = getBasePoints();
    const pointMap = new Map<string, GeoPoint>();

    for (const point of basePoints) {
      pointMap.set(point.id, point);
    }

    if (articles && articles.length > 0) {
      for (const article of articles) {
        const locationId = createPointId(article.location.name);

        const existingPoint = pointMap.get(locationId);
        if (existingPoint) {
          pointMap.set(locationId, {
            ...existingPoint,
            hasNews: true,
            newsCount: existingPoint.newsCount + 1,
          });
        } else {
          pointMap.set(locationId, {
            id: locationId,
            lat: article.location.lat,
            lng: article.location.lng,
            name: article.location.name,
            region: article.location.region,
            hasNews: true,
            newsCount: 1,
          });
        }
      }
    }

    set({ points: Array.from(pointMap.values()) });
  },
}));

export function getDisplayPoints(points: GeoPoint[]): GeoPoint[] {
  const withNews = points.filter((p) => p.hasNews);
  const withoutNews = points.filter((p) => !p.hasNews);
  const sampledCities = withoutNews.filter((_, i) => i % 5 === 0);
  return [...withNews, ...sampledCities];
}
