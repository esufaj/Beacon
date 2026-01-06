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
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// Check if two coordinates are close (within ~50km)
function isNearLocation(lat1: number, lng1: number, lat2: number, lng2: number): boolean {
  const latDiff = Math.abs(lat1 - lat2);
  const lngDiff = Math.abs(lng1 - lng2);
  return latDiff < 0.5 && lngDiff < 0.5;
}

export function NewsCard({ article, index, isLast }: NewsCardProps) {
  const { setSelectedArticle } = useNewsStore();
  const { points, selectedPoint, setSelectedPoint, setAutoRotating, flyTo } = useGlobeStore();

  const handleClick = () => {
    const articleLocationId = normalizeLocationId(article.location.name);
    
    // Find the matching point from globe points
    const point = points.find(
      (p) =>
        p.id === articleLocationId ||
        p.name.toLowerCase() === article.location.name.toLowerCase()
    );

    // Check if we're already at this location
    const alreadyAtLocation = selectedPoint && (
      selectedPoint.id === articleLocationId ||
      selectedPoint.name.toLowerCase() === article.location.name.toLowerCase() ||
      isNearLocation(
        selectedPoint.lat, 
        selectedPoint.lng, 
        article.location.lat, 
        article.location.lng
      )
    );

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <div
        onClick={handleClick}
        className={cn(
          "px-4 py-3 cursor-pointer",
          "hover:bg-blue-500/10",
          "transition-colors duration-150",
          "group",
          !isLast && "border-b border-black/5 dark:border-white/5"
        )}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <CategoryTag category={article.category} />
          <span className="text-[10px] text-slate-400 dark:text-neutral-500 ml-auto">
            {formatDistanceToNow(article.timestamp, { addSuffix: true })}
          </span>
        </div>

        <h3 className="font-semibold text-sm text-slate-900 dark:text-white leading-tight mb-1.5 line-clamp-2 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
          {article.headline}
        </h3>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
            <MapPin className="w-3 h-3 text-blue-500" />
            <span>{article.location.name}</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-neutral-500">
            {article.source}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
