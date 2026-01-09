"use client";

import { MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { CategoryTag } from "./category-tag";
import { useNewsStore } from "@/stores/news-store";
import { useGlobeStore } from "@/stores/globe-store";
import type { NewsArticle } from "@/types";
import { cn } from "@/lib/utils";

interface NewsCardProps {
  article: NewsArticle;
  index: number;
  isLast?: boolean;
}

function normalizeLocationId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// Check if two coordinates are close (within ~50km)
function isNearLocation(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): boolean {
  const latDiff = Math.abs(lat1 - lat2);
  const lngDiff = Math.abs(lng1 - lng2);
  return latDiff < 0.5 && lngDiff < 0.5;
}

export function NewsCard({ article, index, isLast }: NewsCardProps) {
  const { setSelectedArticle } = useNewsStore();
  const { points, selectedPoint, setSelectedPoint, setAutoRotating, flyTo } =
    useGlobeStore();

  const handleClick = () => {
    const articleLocationId = normalizeLocationId(article.location.name);

    // Find the matching point from globe points
    const point = points.find(
      (p) =>
        p.id === articleLocationId ||
        p.name.toLowerCase() === article.location.name.toLowerCase()
    );

    // Check if we're already at this location
    const alreadyAtLocation =
      selectedPoint &&
      (selectedPoint.id === articleLocationId ||
        selectedPoint.name.toLowerCase() ===
          article.location.name.toLowerCase() ||
        isNearLocation(
          selectedPoint.lat,
          selectedPoint.lng,
          article.location.lat,
          article.location.lng
        ));

    if (alreadyAtLocation) {
      setSelectedArticle(article);
    } else if (point) {
      setSelectedPoint(point);
      setAutoRotating(false);
      flyTo(point.lat, point.lng, 4);

      setTimeout(() => {
        setSelectedArticle(article);
      }, 1600);
    } else {
      const newPoint = {
        id: articleLocationId,
        lat: article.location.lat,
        lng: article.location.lng,
        name: article.location.name,
        region: article.location.region,
        hasNews: true,
        newsCount: 1,
      };
      setSelectedPoint(newPoint);
      setAutoRotating(false);
      flyTo(article.location.lat, article.location.lng, 4);

      setTimeout(() => {
        setSelectedArticle(article);
      }, 1600);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.02, 0.3),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div
        onClick={handleClick}
        className={cn(
          "mx-4 px-3py-3 cursor-pointer rounded-lg",
          "hover:bg-accent",
          "transition-all duration-150 ease-out",
          "group",
          "active:scale-[0.99]"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <CategoryTag category={article.category} />
          <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
            {formatDistanceToNow(article.timestamp, { addSuffix: true })}
          </span>
        </div>

        <h3 className="font-medium text-[13px] text-foreground leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-150">
          {article.headline}
        </h3>

        <div className="flex items-center gap-2.5 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3 h-3 text-primary/70" />
            <span>{article.location.name}</span>
          </div>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-muted-foreground/60">{article.source}</span>
        </div>
      </div>
    </motion.div>
  );
}
