"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useGlobeStore, getDisplayPoints } from "@/stores/globe-store";
import { useNewsStore } from "@/stores/news-store";
import type { GeoPoint } from "@/types";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  ),
});

interface BeamPoint extends GeoPoint {
  isBeam?: boolean;
}

export function BeaconGlobe() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const wasAutoRotatingRef = useRef(true);
  const [beamPhase, setBeamPhase] = useState(0);

  const {
    points,
    selectedPoint,
    isAutoRotating,
    setSelectedPoint,
    setAutoRotating,
    registerResetCallback,
    registerFlyToCallback,
  } = useGlobeStore();
  const { filterByLocation, clearFilters } = useNewsStore();

  // Get display points (major cities + news locations) - no clustering
  const displayPoints = useMemo(() => getDisplayPoints(points), [points]);

  // Animate beam heights - 4 phases for shoot up/down cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setBeamPhase((prev) => (prev + 1) % 4);
    }, 1500); // Update every 1.5s (6 second full cycle)
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (globeRef.current && isReady) {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = isAutoRotating;
        controls.autoRotateSpeed = 0.8;
        controls.enableZoom = true;
        controls.minDistance = 120;
        controls.maxDistance = 500;
      }
    }
  }, [isAutoRotating, isReady]);

  useEffect(() => {
    registerResetCallback(() => {
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.8;
        }
      }
    });

    registerFlyToCallback((lat: number, lng: number, altitude = 1.5) => {
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat, lng, altitude }, 1000);
      }
    });
  }, [registerResetCallback, registerFlyToCallback]);

  const handleGlobeReady = useCallback(() => {
    setIsReady(true);
    setAutoRotating(true);
    wasAutoRotatingRef.current = true;
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.8;
        controls.enableZoom = true;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
      }
    }
  }, [setAutoRotating]);

  const handlePointClick = useCallback(
    (point: object) => {
      const beamPoint = point as BeamPoint;

      // Get the base point ID (remove -beam suffix if present)
      const baseId = beamPoint.id.replace("-beam", "");

      // Find the actual base point from displayPoints
      const basePoint = displayPoints.find((p) => p.id === baseId);
      if (!basePoint) return;

      setSelectedPoint(basePoint);
      wasAutoRotatingRef.current = isAutoRotating;
      setAutoRotating(false);
      filterByLocation(basePoint.id);

      if (globeRef.current) {
        globeRef.current.pointOfView(
          { lat: basePoint.lat, lng: basePoint.lng, altitude: 1.5 },
          1000
        );
      }
    },
    [
      setSelectedPoint,
      setAutoRotating,
      filterByLocation,
      isAutoRotating,
      displayPoints,
    ]
  );

  const handleGlobeClick = useCallback(() => {
    clearFilters();
    setSelectedPoint(null);
  }, [clearFilters, setSelectedPoint]);

  // Create combined data: bases (large clickable) + beams (thin animated)
  // Include beamPhase to force re-render when animation ticks
  const combinedPointsData = useMemo(() => {
    const result: BeamPoint[] = [];

    // Add base points (large, clickable circles at surface)
    for (const point of displayPoints) {
      result.push({ ...point, isBeam: false });
    }

    // Add beam points (thin, tall beams for news locations)
    for (const point of displayPoints) {
      if (point.hasNews) {
        result.push({ ...point, isBeam: true, id: `${point.id}-beam` });
      }
    }

    return result;
  }, [displayPoints]);

  const getPointColor = useCallback(
    (point: object) => {
      const beamPoint = point as BeamPoint;

      // Check if this is the selected point (either base or beam)
      const baseId = beamPoint.id.replace("-beam", "");
      const isSelected = selectedPoint?.id === baseId;

      if (beamPoint.isBeam) {
        // Stagger beams based on ID hash
        const idHash = beamPoint.id
          .split("")
          .reduce((a, b) => a + b.charCodeAt(0), 0);
        const offset = idHash % 4;
        const phase = (beamPhase + offset) % 4;

        // Brightness based on phase: dim when low, bright when up
        const brightness = phase === 1 || phase === 2 ? 1.0 : 0.4;

        if (isSelected) {
          return `rgba(34, 197, 94, ${brightness})`;
        }
        return `rgba(249, 115, 22, ${brightness})`;
      }

      // Base point colors
      if (isSelected) {
        return "#22C55E";
      }
      return beamPoint.hasNews ? "#F97316" : "rgba(255, 255, 255, 0.12)";
    },
    [selectedPoint, beamPhase]
  );

  // Animated beam height - creates "shooting up into the sky" effect
  const getPointAltitude = useCallback(
    (point: object) => {
      const beamPoint = point as BeamPoint;

      if (beamPoint.isBeam) {
        const maxHeight = 0.25 + Math.min(beamPoint.newsCount * 0.05, 0.25);

        // Stagger beams based on ID hash (0-3 offset)
        const idHash = beamPoint.id
          .split("")
          .reduce((a, b) => a + b.charCodeAt(0), 0);
        const offset = idHash % 4;
        const phase = (beamPhase + offset) % 4;

        // 4-phase cycle: low -> up -> hold -> down
        // Phase 0: low, Phase 1: shooting up, Phase 2: at peak, Phase 3: retracting
        if (phase === 0) {
          return 0.02; // Low/reset
        } else if (phase === 1 || phase === 2) {
          return maxHeight; // Up and hold
        } else {
          return 0.02; // Retracting
        }
      }

      // Base points - flat circles on surface
      if (beamPoint.hasNews) {
        return 0.003;
      }
      return 0.001;
    },
    [beamPhase]
  );

  // Point radius: large base for clicking, skinny beam
  const getPointRadius = useCallback(
    (point: object) => {
      const beamPoint = point as BeamPoint;
      const baseId = beamPoint.id.replace("-beam", "");
      const isSelected = selectedPoint?.id === baseId;

      if (beamPoint.isBeam) {
        // Skinny beams
        return isSelected ? 0.06 : 0.04;
      }

      // Large clickable base
      if (isSelected) {
        return 0.6;
      }
      if (beamPoint.hasNews) {
        return 0.45; // Large clickable area
      }
      return 0.08;
    },
    [selectedPoint]
  );

  const getPointLabel = useCallback(
    (point: object) => {
      const beamPoint = point as BeamPoint;

      // Don't show labels for beams, only bases
      if (beamPoint.isBeam || !beamPoint.hasNews) return "";

      const isSelected = selectedPoint?.id === beamPoint.id;
      const accentColor = isSelected ? "#22C55E" : "#F97316";

      return `
      <div style="
        background: linear-gradient(135deg, rgba(23, 23, 28, 0.98) 0%, rgba(15, 15, 20, 0.98) 100%);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px 16px;
        font-family: 'Nunito Sans', sans-serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        min-width: 140px;
        max-width: 200px;
        pointer-events: none;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        ">
          <div style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${accentColor};
            box-shadow: 0 0 8px ${accentColor};
          "></div>
          <div style="
            font-weight: 700;
            color: #ffffff;
            font-size: 14px;
            letter-spacing: -0.01em;
          ">${beamPoint.name}</div>
        </div>
        <div style="
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          font-weight: 500;
          padding-left: 16px;
        ">
          ${beamPoint.newsCount} ${
        beamPoint.newsCount === 1 ? "story" : "stories"
      }
        </div>
      </div>
    `;
    },
    [selectedPoint]
  );

  // Ring data - only news points get pulsating rings
  const activeRingPoints = useMemo(() => {
    return displayPoints.filter((p) => p.hasNews);
  }, [displayPoints]);

  const getRingColor = useCallback(
    (point: object) => {
      const geoPoint = point as GeoPoint;
      if (selectedPoint?.id === geoPoint.id) {
        return (t: number) => `rgba(34, 197, 94, ${1 - t})`;
      }
      return (t: number) => `rgba(249, 115, 22, ${1 - t})`;
    },
    [selectedPoint]
  );

  // Ring pulse settings - dramatic outward pulse every 3 seconds
  const getRingMaxRadius = useCallback(() => 4, []);
  const getRingPropagationSpeed = useCallback(() => 2, []);
  const getRingRepeatPeriod = useCallback(() => 3000, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-grab active:cursor-grabbing flex items-center justify-center"
      onClick={handleGlobeClick}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
          backgroundImageUrl=""
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#3B82F6"
          atmosphereAltitude={0.18}
          pointsData={combinedPointsData}
          pointLat="lat"
          pointLng="lng"
          pointColor={getPointColor}
          pointAltitude={getPointAltitude}
          pointRadius={getPointRadius}
          pointLabel={getPointLabel}
          onPointClick={handlePointClick}
          pointsMerge={false}
          pointsTransitionDuration={800}
          ringsData={activeRingPoints}
          ringLat="lat"
          ringLng="lng"
          ringColor={getRingColor}
          ringMaxRadius={getRingMaxRadius}
          ringPropagationSpeed={getRingPropagationSpeed}
          ringRepeatPeriod={getRingRepeatPeriod}
          onGlobeReady={handleGlobeReady}
          animateIn={true}
        />
      )}

      {/* Atmospheric glow effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(59,130,246,0.05)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-neutral-950/60" />
      </div>
    </div>
  );
}
