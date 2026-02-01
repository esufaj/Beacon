import {
  findCityByName,
  findNearestCity,
  getCapitalByCountry,
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
  source: "database";
}

const geocodeCache = new Map<string, GeocodingResult | null>();

const US_STATE_ABBREVS: Record<string, string> = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
  "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
  "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
  "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
  "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
  "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
  "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
  "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
  "DC": "District of Columbia",
};

function normalizeLocation(text: string): string {
  let normalized = text.trim();
  for (const [abbrev, full] of Object.entries(US_STATE_ABBREVS)) {
    const regex = new RegExp(`\\b${abbrev}\\b`, "gi");
    normalized = normalized.replace(regex, full);
  }
  return normalized;
}

export function geocode(locationText: string): GeocodingResult | null {
  if (!locationText || locationText.trim().length === 0 || locationText.toLowerCase() === "unknown") {
    return null;
  }
  
  const cacheKey = locationText.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) || null;
  }
  
  const normalized = normalizeLocation(locationText);
  const parts = normalized.split(",").map((p) => p.trim());
  const cityName = parts[0];
  const stateOrCountry = parts[1];
  
  let result: GeocodingResult | null = null;
  
  const dbMatch = findCityByName(cityName, stateOrCountry);
  if (dbMatch) {
    result = worldCityToResult(dbMatch, "high");
  }
  
  if (!result && parts.length === 1) {
    const capital = getCapitalByCountry(cityName);
    if (capital) {
      result = worldCityToResult(capital, "medium");
    }
  }
  
  if (!result && stateOrCountry) {
    const stateMatch = findCityByName(stateOrCountry);
    if (stateMatch) {
      result = worldCityToResult(stateMatch, "low");
    }
  }
  
  geocodeCache.set(cacheKey, result);
  return result;
}

function worldCityToResult(
  city: WorldCity,
  confidence: "high" | "medium" | "low"
): GeocodingResult {
  return {
    lat: city.lat,
    lng: city.lng,
    name: city.name,
    country: city.country,
    countryCode: city.countryCode,
    region: city.region,
    confidence,
    source: "database",
  };
}

export function batchGeocode(
  locations: string[]
): Map<string, GeocodingResult | null> {
  const results = new Map<string, GeocodingResult | null>();
  
  for (const location of locations) {
    const result = geocode(location);
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
  
  return worldCityToResult(nearest, "medium");
}




