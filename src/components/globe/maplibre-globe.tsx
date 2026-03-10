"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import Map from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useTheme } from "next-themes";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGlobeStore, getDisplayPoints } from "@/stores/globe-store";
import { useNewsStore } from "@/stores/news-store";
import { useUIStore } from "@/stores/ui-store";
import { NewsMarker } from "./news-marker";
import { getStyleUrl } from "@/lib/map-styles";

const LOADING_FRAMES = ["◐", "◓", "◑", "◒"];
const LOADING_MESSAGES = [
  "Scanning the globe...",
  "Finding stories...",
  "Mapping locations...",
  "Almost there...",
];

function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function GlobeFallback({ error }: { error?: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background text-center px-8">
      <div className="font-mono text-5xl text-muted-foreground/30 mb-6">◌</div>
      <h2 className="text-sm font-medium text-foreground mb-2">
        Globe unavailable
      </h2>
      <p className="text-xs text-muted-foreground max-w-[280px]">
        {error ||
          "WebGL is required but not supported by your browser. Try disabling hardware acceleration restrictions or using a different browser."}
      </p>
    </div>
  );
}

interface GlobeErrorBoundaryState {
  hasError: boolean;
  error: string | null;
}

export class GlobeErrorBoundary extends Component<
  { children: ReactNode },
  GlobeErrorBoundaryState
> {
  state: GlobeErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(err: Error): GlobeErrorBoundaryState {
    return { hasError: true, error: err.message };
  }

  componentDidCatch(err: Error) {
    console.error("[Globe] Render error:", err);
  }

  render() {
    if (this.state.hasError) {
      return <GlobeFallback error={this.state.error ?? undefined} />;
    }
    return this.props.children;
  }
}

const getDefaultZoom = (width: number): number => {
  if (width >= 1920) return 2.2;
  if (width >= 1440) return 2.0;
  if (width >= 1024) return 1.8;
  return 1.5;
};

const INITIAL_VIEW = {
  longitude: 0,
  latitude: 20,
  zoom: 1.8,
  pitch: 0,
  bearing: 0,
};

const ROTATION_SPEED = 0.18;
const FAST_SPIN_SPEED = 2.5;
const FAST_SPIN_DURATION = 1200;

export function MapLibreGlobe() {
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadingFrame, setLoadingFrame] = useState(0);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [webglSupported, setWebglSupported] = useState(true);

  useEffect(() => {
    if (!isWebGLSupported()) {
      setWebglSupported(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) return;

    const frameInterval = setInterval(() => {
      setLoadingFrame((f) => (f + 1) % LOADING_FRAMES.length);
    }, 120);

    const messageInterval = setInterval(() => {
      setLoadingMessageIndex((m) => (m + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => {
      clearInterval(frameInterval);
      clearInterval(messageInterval);
    };
  }, [isLoaded]);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const isZoomingRef = useRef(false);
  const fastSpinRef = useRef<{
    active: boolean;
    startTime: number;
    targetZoom: number;
  }>({
    active: false,
    startTime: 0,
    targetZoom: 1.8,
  });

  const points = useGlobeStore((s) => s.points);
  const selectedPoint = useGlobeStore((s) => s.selectedPoint);
  const isAutoRotating = useGlobeStore((s) => s.isAutoRotating);
  const layers = useGlobeStore((s) => s.layers);
  const projection = useGlobeStore((s) => s.projection);
  const setSelectedPoint = useGlobeStore((s) => s.setSelectedPoint);
  const setAutoRotating = useGlobeStore((s) => s.setAutoRotating);
  const setMapRef = useGlobeStore((s) => s.setMapRef);
  const setZoomLevel = useGlobeStore((s) => s.setZoomLevel);

  const filterByLocation = useNewsStore((s) => s.filterByLocation);
  const clearLocationSelection = useNewsStore((s) => s.clearLocationSelection);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const { resolvedTheme } = useTheme();

  const displayPoints = useMemo(() => getDisplayPoints(points), [points]);
  const mapStyle = useMemo(
    () => getStyleUrl(resolvedTheme === "light" ? "light" : "dark"),
    [resolvedTheme],
  );

  useEffect(() => {
    const updateWidth = () => {
      setContainerWidth(window.innerWidth);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const defaultZoom = useMemo(
    () => getDefaultZoom(containerWidth),
    [containerWidth],
  );

  // Store map ref in global state
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      setMapRef(mapRef.current);
    }
    return () => setMapRef(null);
  }, [setMapRef, isLoaded]);

  // Set globe projection after style loads and when style/theme changes
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const map = mapRef.current.getMap();

    const applyProjection = () => {
      try {
        map.setProjection({ type: projection });
      } catch (e) {
        console.warn("Projection not available:", e);
      }
    };

    if (map.isStyleLoaded()) {
      applyProjection();
    }

    // Also listen for future style loads (theme changes are style loads)
    map.on("style.load", applyProjection);

    return () => {
      map.off("style.load", applyProjection);
    };
  }, [isLoaded, projection]);

  // Toggle layer visibility
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const map = mapRef.current.getMap();

    const toggleLayerVisibility = (patterns: string[], visible: boolean) => {
      const style = map.getStyle();
      if (!style?.layers) return;

      for (const layer of style.layers) {
        for (const pattern of patterns) {
          if (layer.id.toLowerCase().includes(pattern.toLowerCase())) {
            try {
              map.setLayoutProperty(
                layer.id,
                "visibility",
                visible ? "visible" : "none",
              );
            } catch {
              // Layer may not support visibility
            }
            break;
          }
        }
      }
    };

    const applyLayers = () => {
      toggleLayerVisibility(["label", "place", "poi", "name"], layers.labels);
      toggleLayerVisibility(["boundary", "border", "admin"], layers.borders);
    };

    // Apply immediately if style is already loaded
    if (map.isStyleLoaded()) {
      applyLayers();
    }

    // Also listen for future style loads (theme changes are style loads)
    map.on("style.load", applyLayers);

    return () => {
      map.off("style.load", applyLayers);
    };
  }, [isLoaded, layers.labels, layers.borders]);

  const triggerFastSpinReset = useCallback(() => {
    if (!mapRef.current) return;

    fastSpinRef.current = {
      active: true,
      startTime: performance.now(),
      targetZoom: defaultZoom,
    };
    setAutoRotating(true);
  }, [defaultZoom, setAutoRotating]);

  useEffect(() => {
    const { setFastSpinCallback } = useGlobeStore.getState();
    if (setFastSpinCallback) {
      setFastSpinCallback(triggerFastSpinReset);
    }
  }, [triggerFastSpinReset]);

  useEffect(() => {
    if (!mapRef.current || !isLoaded || !isAutoRotating) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }

    const map = mapRef.current.getMap();
    lastFrameTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      if (!isAutoRotating || !map || isZoomingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        lastFrameTimeRef.current = currentTime;
        return;
      }

      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      const normalizedDelta = Math.min(deltaTime / 16.67, 3);

      let currentSpeed = ROTATION_SPEED;

      if (fastSpinRef.current.active) {
        const elapsed = currentTime - fastSpinRef.current.startTime;
        const progress = Math.min(elapsed / FAST_SPIN_DURATION, 1);

        const easeOut = 1 - Math.pow(1 - progress, 3);
        currentSpeed =
          FAST_SPIN_SPEED * (1 - easeOut) + ROTATION_SPEED * easeOut;

        if (progress >= 1) {
          fastSpinRef.current.active = false;
        }
      }

      const center = map.getCenter();
      const newLng =
        ((center.lng + currentSpeed * normalizedDelta + 180) % 360) - 180;

      map.setCenter([newLng, center.lat]);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isLoaded, isAutoRotating]);

  // Animate in on load
  useEffect(() => {
    if (!isLoaded || !isAnimatingIn) return;

    const timer = setTimeout(() => {
      setIsAnimatingIn(false);
      setAutoRotating(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [isLoaded, isAnimatingIn, setAutoRotating]);

  const handleMapLoad = useCallback(() => {
    setIsLoaded(true);
    if (mapRef.current && containerWidth > 0) {
      mapRef.current.flyTo({
        zoom: getDefaultZoom(containerWidth),
        duration: 0,
      });
    }
  }, [containerWidth]);

  const handleInteractionStart = useCallback(() => {
    if (isAutoRotating) {
      setAutoRotating(false);
    }
  }, [isAutoRotating, setAutoRotating]);

  const handleZoomStart = useCallback(() => {
    isZoomingRef.current = true;
    if (isAutoRotating) {
      setAutoRotating(false);
    }
  }, [isAutoRotating, setAutoRotating]);

  const handleMoveEnd = useCallback(() => {
    isZoomingRef.current = false;
    if (mapRef.current) {
      setZoomLevel(mapRef.current.getZoom());
    }
  }, [setZoomLevel]);

  const handleMapClick = useCallback(() => {
    setSelectedPoint(null);
    clearLocationSelection();
  }, [setSelectedPoint, clearLocationSelection]);

  const handleMarkerClick = useCallback(
    (point: (typeof displayPoints)[0]) => {
      setAutoRotating(false);
      filterByLocation(point.id);

      const isAlreadyAtLocation = selectedPoint?.id === point.id;

      if (isAlreadyAtLocation) {
        setSidebarOpen(true);
        return;
      }

      setSelectedPoint(point);

      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [point.lng, point.lat],
          zoom: 4,
          duration: 1500,
          essential: true,
        });
      }

      setTimeout(() => {
        setSidebarOpen(true);
      }, 1600);
    },
    [
      selectedPoint,
      setSelectedPoint,
      filterByLocation,
      setAutoRotating,
      setSidebarOpen,
    ],
  );

  if (!webglSupported) {
    return <GlobeFallback />;
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-background">
      {!isLoaded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background">
          <div className="font-mono text-5xl text-primary mb-5 select-none animate-[spin_2s_linear_infinite]">
            {LOADING_FRAMES[loadingFrame]}
          </div>
          <p
            key={loadingMessageIndex}
            className="text-sm text-muted-foreground font-medium animate-[fadeSlideIn_300ms_ease-out]"
          >
            {LOADING_MESSAGES[loadingMessageIndex]}
          </p>
        </div>
      )}

      <div
        className={`w-full h-full transition-all duration-700 ease-out ${
          isAnimatingIn ? "scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW}
          onLoad={handleMapLoad}
          onMouseDown={handleInteractionStart}
          onTouchStart={handleInteractionStart}
          onZoomStart={handleZoomStart}
          onMoveEnd={handleMoveEnd}
          onClick={handleMapClick}
          mapStyle={mapStyle}
          style={{ width: "100%", height: "100%" }}
          maxPitch={85}
          minZoom={1}
          maxZoom={18}
          attributionControl={false}
          renderWorldCopies={false}
        >
          {isLoaded &&
            !isAnimatingIn &&
            displayPoints.map((point) => (
              <NewsMarker
                key={point.id}
                point={point}
                isSelected={selectedPoint?.id === point.id}
                onMarkerClick={handleMarkerClick}
              />
            ))}
        </Map>
      </div>
    </div>
  );
}
