"use client";

import { useState, useCallback } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import type { GeoPoint } from "@/types";

interface NewsMarkerProps {
  point: GeoPoint;
  isSelected: boolean;
  onClick: () => void;
}

export function NewsMarker({ point, isSelected, onClick }: NewsMarkerProps) {
  const [showPopup, setShowPopup] = useState(false);

  const hasNews = point.hasNews;
  const baseColor = isSelected
    ? "#22C55E"
    : hasNews
    ? "#3B82F6"
    : "rgba(255, 255, 255, 0.2)";
  const size = hasNews ? (isSelected ? 16 : 12) : 6;

  const handleMouseEnter = useCallback(() => {
    if (hasNews) setShowPopup(true);
  }, [hasNews]);

  const handleMouseLeave = useCallback(() => {
    setShowPopup(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick();
    },
    [onClick]
  );

  return (
    <>
      <Marker longitude={point.lng} latitude={point.lat} anchor="center">
        <div
          className="relative cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{ width: size * 3, height: size * 3 }}
        >
          {hasNews && (
            <>
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  backgroundColor: baseColor,
                  opacity: 0.3,
                  animationDuration: "2s",
                }}
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: baseColor,
                  opacity: 0.15,
                  transform: "scale(2)",
                  filter: "blur(8px)",
                }}
              />
            </>
          )}

          <div
            className="absolute rounded-full shadow-lg transition-transform duration-200 hover:scale-125"
            style={{
              width: size,
              height: size,
              backgroundColor: baseColor,
              boxShadow: hasNews
                ? `0 0 ${size}px ${baseColor}, 0 0 ${size * 2}px ${baseColor}40`
                : "none",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </Marker>

      {showPopup && hasNews && (
        <Popup
          longitude={point.lng}
          latitude={point.lat}
          anchor="bottom"
          closeButton={false}
          closeOnClick={false}
          offset={20}
          className="news-marker-popup"
        >
          <div className="px-3 py-2.5 min-w-[160px]">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: baseColor,
                  boxShadow: `0 0 6px ${baseColor}`,
                }}
              />
              <span className="font-semibold text-[13px] text-foreground truncate">
                {point.name}
              </span>
            </div>
            {point.region && (
              <div className="text-[11px] text-muted-foreground pl-4 mb-1 capitalize">
                {point.region.replace(/-/g, " ")}
              </div>
            )}
            <div className="text-[11px] text-primary font-medium pl-4 tabular-nums">
              {point.newsCount} {point.newsCount === 1 ? "story" : "stories"}
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
