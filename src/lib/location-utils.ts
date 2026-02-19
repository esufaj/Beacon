import type { Location } from "@/types";

const INVALID_LOCATION_VALUES = new Set([
  "unknown",
  "earth",
  "mars",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
]);

const LOCATION_ALIASES: Record<string, string> = {
  "us": "United States",
  "u.s.": "United States",
  "u.s": "United States",
  "usa": "United States",
  "u.s.a.": "United States",
  "u.s.a": "United States",
  "united states of america": "United States",
  "uk": "United Kingdom",
  "u.k.": "United Kingdom",
  "u.k": "United Kingdom",
  "great britain": "United Kingdom",
  "britain": "United Kingdom",
  "uae": "United Arab Emirates",
  "u.a.e.": "United Arab Emirates",
  "u.a.e": "United Arab Emirates",
};

const MULTI_LOCATION_SPLIT_REGEX = /[\/|;]/;

export function sanitizeLocationString(raw?: string | null): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  if (MULTI_LOCATION_SPLIT_REGEX.test(value)) {
    value = value.split(MULTI_LOCATION_SPLIT_REGEX)[0]?.trim() ?? "";
  }

  value = value.replace(/\s*,\s*unknown\s*$/i, "").trim();
  value = value.replace(/\s*\(unknown\)\s*$/i, "").trim();

  if (!value) return null;
  if (/\d/.test(value) && !value.includes(",")) return null;
  const lower = value.toLowerCase();
  if (INVALID_LOCATION_VALUES.has(lower)) return null;

  const alias =
    LOCATION_ALIASES[lower] ||
    LOCATION_ALIASES[lower.replace(/\./g, "")];
  return alias ?? value;
}

export function isUnknownLocation(raw?: string | null): boolean {
  return sanitizeLocationString(raw) === null;
}

export function formatLocationLabel(
  location: Pick<Location, "name" | "country">
): string {
  const name = sanitizeLocationString(location.name);
  if (!name) return "Unknown";

  if (name.includes(",")) return name;

  const country = sanitizeLocationString(location.country);
  if (!country || country.toLowerCase() === name.toLowerCase()) return name;

  return `${name}, ${country}`;
}

export function getLocationKey(
  location: Pick<Location, "name" | "country">
): string | null {
  const label = formatLocationLabel(location);
  return label === "Unknown" ? null : label;
}
