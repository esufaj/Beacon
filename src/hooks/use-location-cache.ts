"use client";

import { useCallback, useRef } from "react";
import type { CachedLocation } from "@/lib/cache/location-cache";

export function useLocationCache() {
  const cacheRef = useRef(new Map<string, CachedLocation | null>());

  const resolveLocation = useCallback(
    async (locationString: string): Promise<CachedLocation | null> => {
      const cached = cacheRef.current.get(locationString);
      if (cached !== undefined) return cached;

      try {
        const res = await fetch(`/api/location?q=${encodeURIComponent(locationString)}`);
        if (!res.ok) {
          cacheRef.current.set(locationString, null);
          return null;
        }
        const data: CachedLocation = await res.json();
        cacheRef.current.set(locationString, data);
        return data;
      } catch {
        cacheRef.current.set(locationString, null);
        return null;
      }
    },
    []
  );

  return { resolveLocation };
}
