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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  } = useGlobeStore();
  const { clearFilters } = useNewsStore();

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
      <div className="glass rounded-2xl px-1.5 py-1.5 flex items-center gap-1">
        {/* Zoom Out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          className="h-9 w-9 rounded-xl hover:bg-white/10"
          title="Zoom out"
        >
          <Minus className="h-4 w-4 text-white" />
        </Button>

        {/* Zoom In */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          className="h-9 w-9 rounded-xl hover:bg-white/10"
          title="Zoom in"
        >
          <Plus className="h-4 w-4 text-white" />
        </Button>

        <Separator orientation="vertical" className="h-5 bg-white/10" />

        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleRotation}
          className="h-9 px-3 rounded-xl hover:bg-white/10 gap-2"
        >
          {isAutoRotating ? (
            <Pause className="h-4 w-4 text-white" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
          <span className="text-xs font-medium text-white/80 hidden sm:inline">
            {isAutoRotating ? "Pause" : "Play"}
          </span>
        </Button>

        {/* Reset */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isResetting}
          className="h-9 px-3 rounded-xl hover:bg-white/10 gap-2"
        >
          <RotateCcw 
            className={cn(
              "h-4 w-4 text-white transition-transform",
              isResetting && "animate-spin"
            )} 
            style={{ animationDuration: isResetting ? "0.3s" : undefined }}
          />
          <span className="text-xs font-medium text-white/80 hidden sm:inline">
            Reset
          </span>
        </Button>

        <Separator orientation="vertical" className="h-5 bg-white/10" />

        {/* Settings toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "h-9 px-3 rounded-xl hover:bg-white/10 gap-2",
            showSettings && "bg-white/10"
          )}
        >
          {showSettings ? (
            <X className="h-4 w-4 text-white" />
          ) : (
            <Settings className="h-4 w-4 text-white" />
          )}
          <span className="text-xs font-medium text-white/80 hidden sm:inline">
            Layers
          </span>
        </Button>

        {/* Layer toggles - expandable */}
        {showSettings && (
          <>
            <Separator orientation="vertical" className="h-5 bg-white/10" />
            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
              {LAYER_OPTIONS.map(({ key, icon: Icon, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLayer(key)}
                  className={cn(
                    "h-9 px-3 rounded-xl gap-2 transition-colors",
                    layers[key]
                      ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                      : "text-white/50 hover:bg-white/10 hover:text-white/80"
                  )}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium hidden lg:inline">
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
