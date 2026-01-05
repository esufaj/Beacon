import {
  findCityByName,
  findNearestCity,
  getCapitalByCountry,
  normalize,
  type WorldCity,
} from "@/data/world-cities";

export interface GeocodingResult {
  lat: number;
  lng: number;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  confidence: "high" | "medium" | "low";
  source: "database" | "nominatim";
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

const nominatimCache = new Map<string, GeocodingResult | null>();
const NOMINATIM_RATE_LIMIT_MS = 1100; // Nominatim requires 1 request per second max
let lastNominatimRequest = 0;

function mapRegion(countryCode: string): string {
  const regionMap: Record<string, string> = {
    // North America
    US: "north-america", CA: "north-america", MX: "north-america",
    // South America
    BR: "south-america", AR: "south-america", CO: "south-america", CL: "south-america",
    PE: "south-america", VE: "south-america", EC: "south-america", BO: "south-america",
    PY: "south-america", UY: "south-america", GY: "south-america", SR: "south-america",
    // Europe
    GB: "europe", FR: "europe", DE: "europe", IT: "europe", ES: "europe", PT: "europe",
    NL: "europe", BE: "europe", CH: "europe", AT: "europe", PL: "europe", CZ: "europe",
    GR: "europe", SE: "europe", NO: "europe", DK: "europe", FI: "europe", IE: "europe",
    RU: "europe", UA: "europe", HU: "europe", RO: "europe", BG: "europe", RS: "europe",
    HR: "europe", SK: "europe", SI: "europe", BA: "europe", AL: "europe", MK: "europe",
    BY: "europe", LT: "europe", LV: "europe", EE: "europe", IS: "europe",
    // Asia
    CN: "asia", JP: "asia", KR: "asia", KP: "asia", TW: "asia", IN: "asia", PK: "asia",
    BD: "asia", TH: "asia", VN: "asia", SG: "asia", MY: "asia", ID: "asia", PH: "asia",
    KH: "asia", MM: "asia", LA: "asia", AF: "asia", UZ: "asia", KZ: "asia", MN: "asia",
    NP: "asia", LK: "asia",
    // Middle East
    AE: "middle-east", SA: "middle-east", IL: "middle-east", IR: "middle-east",
    IQ: "middle-east", LB: "middle-east", JO: "middle-east", SY: "middle-east",
    KW: "middle-east", QA: "middle-east", OM: "middle-east", BH: "middle-east",
    YE: "middle-east", TR: "middle-east",
    // Africa
    EG: "africa", MA: "africa", DZ: "africa", TN: "africa", LY: "africa", SD: "africa",
    NG: "africa", GH: "africa", SN: "africa", CI: "africa", KE: "africa", TZ: "africa",
    ET: "africa", UG: "africa", RW: "africa", ZA: "africa", ZW: "africa", ZM: "africa",
    MZ: "africa", AO: "africa", CD: "africa",
    // Oceania
    AU: "oceania", NZ: "oceania", FJ: "oceania", PG: "oceania",
  };
  
  return regionMap[countryCode.toUpperCase()] || "other";
}

export async function geocode(locationText: string): Promise<GeocodingResult | null> {
  if (!locationText || locationText.trim().length === 0) {
    return null;
  }
  
  const normalized = normalize(locationText);
  
  // Step 1: Try exact match in database
  const parts = locationText.split(",").map((p) => p.trim());
  const cityName = parts[0];
  const countryHint = parts[1];
  
  const dbMatch = findCityByName(cityName, countryHint);
  if (dbMatch) {
    return worldCityToResult(dbMatch, "high", "database");
  }
  
  // Step 2: Try country capital match
  if (parts.length === 1) {
    const capital = getCapitalByCountry(cityName);
    if (capital) {
      return worldCityToResult(capital, "medium", "database");
    }
  }
  
  // Step 3: Check Nominatim cache
  if (nominatimCache.has(normalized)) {
    return nominatimCache.get(normalized) || null;
  }
  
  // Step 4: Query Nominatim API (with rate limiting)
  try {
    const result = await queryNominatim(locationText);
    nominatimCache.set(normalized, result);
    return result;
  } catch (error) {
    console.error("Nominatim geocoding error:", error);
    nominatimCache.set(normalized, null);
    return null;
  }
}

async function queryNominatim(query: string): Promise<GeocodingResult | null> {
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastNominatimRequest;
  if (timeSinceLastRequest < NOMINATIM_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, NOMINATIM_RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  lastNominatimRequest = Date.now();
  
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    addressdetails: "1",
  });
  
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        "User-Agent": "Beacon News Globe (contact@example.com)",
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`);
  }
  
  const data: NominatimResponse[] = await response.json();
  
  if (!data || data.length === 0) {
    return null;
  }
  
  const result = data[0];
  const cityName =
    result.address?.city ||
    result.address?.town ||
    result.address?.village ||
    result.display_name.split(",")[0];
  
  const countryCode = result.address?.country_code?.toUpperCase() || "XX";
  
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    name: cityName,
    country: result.address?.country || "Unknown",
    countryCode,
    region: mapRegion(countryCode),
    confidence: "low",
    source: "nominatim",
  };
}

function worldCityToResult(
  city: WorldCity,
  confidence: "high" | "medium" | "low",
  source: "database" | "nominatim"
): GeocodingResult {
  return {
    lat: city.lat,
    lng: city.lng,
    name: city.name,
    country: city.country,
    countryCode: city.countryCode,
    region: city.region,
    confidence,
    source,
  };
}

export async function batchGeocode(
  locations: string[]
): Promise<Map<string, GeocodingResult | null>> {
  const results = new Map<string, GeocodingResult | null>();
  
  for (const location of locations) {
    const result = await geocode(location);
    results.set(location, result);
  }
  
  return results;
}

export function findClosestKnownLocation(
  lat: number,
  lng: number
): GeocodingResult | null {
  const nearest = findNearestCity(lat, lng);
  if (!nearest) return null;
  
  return worldCityToResult(nearest, "medium", "database");
}




