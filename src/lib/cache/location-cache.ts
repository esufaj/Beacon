import "server-only";

import { getRedisAdapter } from "./redis-client";

const LOCATIONS_KEY = "news:articles:24h:locations";
const LOCATIONS_TTL_SECONDS = 24 * 60 * 60;
const HASH_CHUNK_SIZE = 100;

export interface CachedLocation {
  name: string;
  lat: number;
  lng: number;
  country: string;
  region: string;
}

export async function getLocationFromRedis(
  locationString: string
): Promise<CachedLocation | null> {
  const adapter = await getRedisAdapter();
  if (!adapter) return null;

  try {
    const results = await adapter.hGetMany(LOCATIONS_KEY, [locationString]);
    const raw = results[0];
    if (!raw) return null;
    return JSON.parse(raw) as CachedLocation;
  } catch {
    return null;
  }
}

export async function setLocationInRedis(
  locationString: string,
  data: CachedLocation
): Promise<void> {
  const adapter = await getRedisAdapter();
  if (!adapter) return;

  try {
    await adapter.hSetOne(LOCATIONS_KEY, locationString, JSON.stringify(data));
  } catch (error) {
    console.warn("[Beacon] Failed to write location to Redis", error);
  }
}

export async function warmLocationCache(
  locations: Array<{ location: string; name: string | null; lat: number | null; lng: number | null; country: string | null; region: string | null }>
): Promise<number> {
  const adapter = await getRedisAdapter();
  if (!adapter || locations.length === 0) return 0;

  const mapping: Record<string, string> = {};
  for (const loc of locations) {
    if (loc.lat == null || loc.lng == null) continue;
    mapping[loc.location] = JSON.stringify({
      name: loc.name ?? loc.location,
      lat: loc.lat,
      lng: loc.lng,
      country: loc.country ?? "Unknown",
      region: loc.region ?? "Unknown",
    } satisfies CachedLocation);
  }

  const fieldCount = Object.keys(mapping).length;
  if (fieldCount === 0) return 0;

  try {
    await adapter.hSetMany(LOCATIONS_KEY, mapping);
    await adapter.expire(LOCATIONS_KEY, LOCATIONS_TTL_SECONDS);
    return fieldCount;
  } catch (error) {
    console.warn("[Beacon] Failed to warm location cache in Redis", error);
    return 0;
  }
}

export async function getAllLocationsFromRedis(): Promise<Record<string, CachedLocation>> {
  const adapter = await getRedisAdapter();
  if (!adapter) return {};

  try {
    const raw = await adapter.hGetAll(LOCATIONS_KEY);
    const result: Record<string, CachedLocation> = {};
    for (const [key, value] of Object.entries(raw)) {
      try {
        result[key] = JSON.parse(value) as CachedLocation;
      } catch {
        // skip malformed entries
      }
    }
    return result;
  } catch {
    return {};
  }
}
