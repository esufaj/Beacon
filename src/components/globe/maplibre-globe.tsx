"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Map from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useGlobeStore, getDisplayPoints } from "@/stores/globe-store";
import { useNewsStore } from "@/stores/news-store";
import { NewsMarker } from "./news-marker";
import { getStyleUrl } from "@/lib/map-styles";

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

  const {
    points,
    selectedPoint,
    isAutoRotating,
    layers,
    setSelectedPoint,
    setAutoRotating,
    setMapRef,
    setZoomLevel,
  } = useGlobeStore();

  const { filterByLocation, clearFilters } = useNewsStore();

  const displayPoints = useMemo(() => getDisplayPoints(points), [points]);
  const mapStyle = useMemo(() => getStyleUrl(), []);

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
    [containerWidth]
  );

  // Store map ref in global state
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      setMapRef(mapRef.current);
    }
    return () => setMapRef(null);
  }, [setMapRef, isLoaded]);

  // Set globe projection after style loads
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const map = mapRef.current.getMap();

    const setGlobe = () => {
      try {
        map.setProjection({ type: "globe" });
      } catch (e) {
        console.warn("Globe projection not available:", e);
      }
    };

    if (map.isStyleLoaded()) {
      setGlobe();
    } else {
      map.once("style.load", setGlobe);
    }
  }, [isLoaded]);

  // Toggle layer visibility
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const map = mapRef.current.getMap();
    if (!map.isStyleLoaded()) return;

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
                visible ? "visible" : "none"
              );
            } catch {
              // Layer may not support visibility
            }
            break;
          }
        }
      }
    };

    toggleLayerVisibility(["label", "place", "poi", "name"], layers.labels);
    toggleLayerVisibility(["boundary", "border", "admin"], layers.borders);
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
      return;
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
    clearFilters();
  }, [setSelectedPoint, clearFilters]);

  const handleMarkerClick = useCallback(
    (point: (typeof displayPoints)[0]) => {
      // Stop rotation first
      setAutoRotating(false);
      setSelectedPoint(point);
      filterByLocation(point.id);

      // Use flyTo for smooth animated zoom (MapLibre API)
      // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#flyto
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [point.lng, point.lat],
          zoom: 4,
          duration: 1500,
          essential: true,
        });
      }
    },
    [setSelectedPoint, filterByLocation, setAutoRotating]
  );

  return (
    <div className="w-full h-full relative overflow-hidden bg-neutral-950">
      {/* Loading state */}
      <div
        className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 transition-opacity duration-500 ${
          isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          <div
            className="absolute inset-2 w-12 h-12 rounded-full border border-transparent border-t-blue-400/50 animate-spin"
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
          />
        </div>
        <p className="mt-6 text-sm text-white/50 tracking-widest uppercase">
          Loading Globe
        </p>
      </div>

      {/* Globe container with grow animation */}
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
                onClick={() => handleMarkerClick(point)}
              />
            ))}
        </Map>
      </div>
    </div>
  );
}
