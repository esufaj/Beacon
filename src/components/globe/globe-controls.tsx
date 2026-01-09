"use client";

import { useState, useRef } from "react";
import {
  RotateCcw,
  Pause,
  Play,
  Settings,
  Tag,
  MapPin,
  X,
  Plus,
  Minus,
  Globe,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobeStore, type LayerVisibility } from "@/stores/globe-store";
import { useNewsStore } from "@/stores/news-store";
import { cn } from "@/lib/utils";

const LAYER_OPTIONS: {
  key: keyof LayerVisibility;
  icon: typeof Tag;
  label: string;
}[] = [
  { key: "labels", icon: Tag, label: "Labels" },
  { key: "borders", icon: MapPin, label: "Borders" },
];

export function GlobeControls() {
  const [showSettings, setShowSettings] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isAutoRotating,
    setAutoRotating,
    triggerFastSpinReset,
    mapRef,
    layers,
    toggleLayer,
    projection,
    toggleProjection,
  } = useGlobeStore();
  const { clearFilters } = useNewsStore();

  const isMapView = projection === "mercator";

  const handleReset = () => {
    clearFilters();
    setShowSettings(false);
    setIsResetting(true);

    triggerFastSpinReset();

    setTimeout(() => {
      setIsResetting(false);
    }, 1300);
  };

  const handleToggleRotation = () => {
    setAutoRotating(!isAutoRotating);
  };

  const handleZoomIn = () => {
    if (!mapRef) return;

    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }

    if (isAutoRotating) {
      setAutoRotating(false);
    }

    const currentZoom = mapRef.getZoom();
    mapRef.flyTo({
      zoom: Math.min(18, currentZoom + 0.8),
      duration: 250,
      essential: true,
    });
  };

  const handleZoomOut = () => {
    if (!mapRef) return;

    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }

    if (isAutoRotating) {
      setAutoRotating(false);
    }

    const currentZoom = mapRef.getZoom();
    mapRef.flyTo({
      zoom: Math.max(1, currentZoom - 0.8),
      duration: 250,
      essential: true,
    });
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
      <div className="glass rounded-xl px-1 py-1 flex items-center gap-0.5 shadow-lg">
        {/* Zoom Out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-8 w-8 rounded-lg hover:bg-accent"
          title="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>

        {/* Zoom In */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-8 w-8 rounded-lg hover:bg-accent"
          title="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Globe/Map Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleProjection}
          className={cn(
            "h-8 px-2.5 rounded-lg hover:bg-accent gap-1.5",
            isMapView && "bg-accent"
          )}
          title={isMapView ? "Switch to globe view" : "Switch to map view"}
        >
          {isMapView ? (
            <Globe className="h-3.5 w-3.5" />
          ) : (
            <Map className="h-3.5 w-3.5" />
          )}
          <span className="text-[12px] font-medium hidden sm:inline">
            {isMapView ? "Globe" : "Map"}
          </span>
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleRotation}
          disabled={isMapView}
          className={cn(
            "h-8 px-2.5 rounded-lg hover:bg-accent gap-1.5",
            isMapView && "opacity-50 cursor-not-allowed"
          )}
          title={
            isMapView
              ? "Rotation disabled in map view"
              : isAutoRotating
              ? "Pause rotation"
              : "Play rotation"
          }
        >
          {isAutoRotating ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          <span className="text-[12px] font-medium hidden sm:inline">
            {isAutoRotating ? "Pause" : "Play"}
          </span>
        </Button>

        {/* Reset */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
          className="h-8 px-2.5 rounded-lg hover:bg-accent gap-1.5"
        >
          <RotateCcw
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              isResetting && "animate-spin"
            )}
            style={{ animationDuration: isResetting ? "0.3s" : undefined }}
          />
          <span className="text-[12px] font-medium hidden sm:inline">
            Reset
          </span>
        </Button>

        <div className="w-px h-5 bg-border mx-0.5" />

        {/* Settings toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "h-8 px-2.5 rounded-lg hover:bg-accent gap-1.5",
            showSettings && "bg-accent"
          )}
        >
          {showSettings ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Settings className="h-3.5 w-3.5" />
          )}
          <span className="text-[12px] font-medium hidden sm:inline">
            Layers
          </span>
        </Button>

        {/* Layer toggles - expandable */}
        {showSettings && (
          <>
            <div className="w-px h-5 bg-border mx-0.5" />
            <div className="flex items-center gap-0.5 animate-slide-in-right">
              {LAYER_OPTIONS.map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLayer(key)}
                  className={cn(
                    "h-8 px-2.5 rounded-lg gap-1.5 transition-colors",
                    layers[key]
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[12px] font-medium hidden lg:inline">
                    {label}
                  </span>
                </Button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
