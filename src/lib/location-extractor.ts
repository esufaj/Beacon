import type { RawArticle } from "@/types";
import { WORLD_CITIES, normalize } from "@/data/world-cities";

const CITY_NAMES = new Set(WORLD_CITIES.map((c) => c.nameNormalized));
const COUNTRY_NAMES = new Set(WORLD_CITIES.map((c) => normalize(c.country)));

// Map countries to their capitals for better location extraction
const COUNTRY_TO_CAPITAL: Record<string, string> = {
  "iran": "Tehran",
  "iranian": "Tehran",
  "turkey": "Istanbul", // Most newsworthy city
  "turkish": "Istanbul",
  "china": "Beijing",
  "chinese": "Beijing",
  "russia": "Moscow",
  "russian": "Moscow",
  "ukraine": "Kyiv",
  "ukrainian": "Kyiv",
  "israel": "Tel Aviv", // News center
  "israeli": "Tel Aviv",
  "palestine": "Gaza",
  "palestinian": "Gaza",
  "syria": "Damascus",
  "syrian": "Damascus",
  "iraq": "Baghdad",
  "iraqi": "Baghdad",
  "afghanistan": "Kabul",
  "afghan": "Kabul",
  "pakistan": "Islamabad",
  "pakistani": "Islamabad",
  "india": "New Delhi",
  "indian": "New Delhi",
  "japan": "Tokyo",
  "japanese": "Tokyo",
  "korea": "Seoul",
  "korean": "Seoul",
  "germany": "Berlin",
  "german": "Berlin",
  "france": "Paris",
  "french": "Paris",
  "uk": "London",
  "britain": "London",
  "british": "London",
  "england": "London",
  "english": "London",
  "spain": "Madrid",
  "spanish": "Madrid",
  "italy": "Rome",
  "italian": "Rome",
  "brazil": "Sao Paulo",
  "brazilian": "Sao Paulo",
  "mexico": "Mexico City",
  "mexican": "Mexico City",
  "canada": "Toronto",
  "canadian": "Toronto",
  "australia": "Sydney",
  "australian": "Sydney",
  "egypt": "Cairo",
  "egyptian": "Cairo",
  "saudi": "Riyadh",
  "arabia": "Riyadh",
  "uae": "Dubai",
  "emirates": "Dubai",
  "nigeria": "Lagos",
  "nigerian": "Lagos",
  "south africa": "Johannesburg",
  "argentina": "Buenos Aires",
  "venezuela": "Caracas",
  "colombia": "Bogota",
  "taiwan": "Taipei",
  "taiwanese": "Taipei",
};

const LOCATION_PATTERNS = [
  // "in [Location]" pattern
  /\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
  // "from [Location]" pattern
  /\bfrom\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
  // "at [Location]" pattern
  /\bat\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g,
  // "[Location] - Source" pattern (Reuters, AP style)
  /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*[-–—]/g,
  // "Source: [Location]" pattern
  /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s*\(/g,
];

const EXCLUDED_WORDS = new Set([
  "the", "a", "an", "this", "that", "these", "those", "said", "says",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december", "today", "yesterday", "tomorrow",
  "president", "minister", "prime", "king", "queen", "prince", "princess",
  "breaking", "update", "live", "watch", "video", "photo", "photos",
  "reuters", "associated", "press", "bbc", "cnn", "fox", "news",
  "just", "new", "now", "here", "there", "when", "where", "what", "who", "why", "how",
]);

export interface ExtractedLocation {
  text: string;
  confidence: "high" | "medium" | "low";
  source: "headline" | "description" | "content" | "hint";
}

export function extractLocation(article: RawArticle): ExtractedLocation | null {
  // Priority 1: Check if article has location hint from API
  if (article.locationHint) {
    return {
      text: article.locationHint,
      confidence: "high",
      source: "hint",
    };
  }

  // Priority 2: Extract from headline (highest confidence)
  const headlineLocation = extractFromText(article.title, "high");
  if (headlineLocation) {
    return { ...headlineLocation, source: "headline" };
  }

  // Priority 3: Extract from description
  if (article.description) {
    const descLocation = extractFromText(article.description, "medium");
    if (descLocation) {
      return { ...descLocation, source: "description" };
    }
  }

  // Priority 4: Extract from content
  if (article.content) {
    const contentLocation = extractFromText(article.content, "low");
    if (contentLocation) {
      return { ...contentLocation, source: "content" };
    }
  }

  // DO NOT infer from source name - causes wrong attributions
  // (e.g., CNN article about Turkey gets assigned to Atlanta)
  return null;
}

function extractFromText(
  text: string,
  baseConfidence: "high" | "medium" | "low"
): Omit<ExtractedLocation, "source"> | null {
  if (!text) return null;

  // First, check for known city/country names directly in text
  const directMatch = findDirectMatch(text);
  if (directMatch) {
    return {
      text: directMatch,
      confidence: baseConfidence,
    };
  }

  // Then try pattern matching
  for (const pattern of LOCATION_PATTERNS) {
    // Use the pattern directly since it already has 'g' flag
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const candidate = match[1]?.trim();
      if (candidate && isValidLocation(candidate)) {
        return {
          text: candidate,
          confidence: baseConfidence === "high" ? "high" : "medium",
        };
      }
    }
  }

  return null;
}

function findDirectMatch(text: string): string | null {
  const normalizedText = normalize(text);
  const words = normalizedText.split(/\s+/);

  // Priority 1: Check for country/nationality references that map to capitals
  for (const word of words) {
    const capital = COUNTRY_TO_CAPITAL[word];
    if (capital) {
      return capital;
    }
  }

  // Priority 2: Check for multi-word city names (e.g., "New York", "Los Angeles")
  for (let i = 0; i < words.length - 1; i++) {
    const twoWord = `${words[i]} ${words[i + 1]}`;
    if (CITY_NAMES.has(twoWord)) {
      return capitalizeWords(twoWord);
    }
    
    // Three-word names (e.g., "New York City", "Salt Lake City")
    if (i < words.length - 2) {
      const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (CITY_NAMES.has(threeWord)) {
        return capitalizeWords(threeWord);
      }
    }
  }

  // Priority 3: Check for single word city names
  for (const word of words) {
    if (word.length > 2 && CITY_NAMES.has(word)) {
      return capitalizeWords(word);
    }
  }

  return null;
}

function isValidLocation(candidate: string): boolean {
  const normalized = normalize(candidate);
  
  // Check excluded words
  if (EXCLUDED_WORDS.has(normalized)) {
    return false;
  }

  // Check if it maps to a capital (country/nationality)
  if (COUNTRY_TO_CAPITAL[normalized]) {
    return true;
  }

  // Check if it's a known city or country (exact match only)
  if (CITY_NAMES.has(normalized) || COUNTRY_NAMES.has(normalized)) {
    return true;
  }

  return false;
}

function inferFromSource(source: string): ExtractedLocation | null {
  // Map news sources to their primary locations
  const sourceLocations: Record<string, string> = {
    "bbc": "London",
    "bbc news": "London",
    "reuters": "London",
    "associated press": "New York",
    "ap": "New York",
    "cnn": "Atlanta",
    "fox news": "New York",
    "the guardian": "London",
    "the times": "London",
    "new york times": "New York",
    "washington post": "Washington",
    "los angeles times": "Los Angeles",
    "chicago tribune": "Chicago",
    "al jazeera": "Doha",
    "france 24": "Paris",
    "dw": "Berlin",
    "deutsche welle": "Berlin",
    "abc news": "New York",
    "nbc news": "New York",
    "sky news": "London",
    "the hindu": "Chennai",
    "times of india": "Mumbai",
    "south china morning post": "Hong Kong",
    "japan times": "Tokyo",
    "sydney morning herald": "Sydney",
    "toronto star": "Toronto",
    "globe and mail": "Toronto",
  };

  const normalizedSource = source.toLowerCase().trim();
  const location = sourceLocations[normalizedSource];
  
  if (location) {
    return {
      text: location,
      confidence: "low",
      source: "hint",
    };
  }

  return null;
}

function capitalizeWords(text: string): string {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function extractMultipleLocations(article: RawArticle): ExtractedLocation[] {
  const locations: ExtractedLocation[] = [];
  const seenTexts = new Set<string>();

  const addLocation = (loc: ExtractedLocation | null) => {
    if (loc && !seenTexts.has(normalize(loc.text))) {
      seenTexts.add(normalize(loc.text));
      locations.push(loc);
    }
  };

  // Check hint
  if (article.locationHint) {
    addLocation({
      text: article.locationHint,
      confidence: "high",
      source: "hint",
    });
  }

  // Check headline
  const headlineLocation = extractFromText(article.title, "high");
  if (headlineLocation) {
    addLocation({ ...headlineLocation, source: "headline" });
  }

  // Check description
  if (article.description) {
    const descLocation = extractFromText(article.description, "medium");
    if (descLocation) {
      addLocation({ ...descLocation, source: "description" });
    }
  }

  // Check content
  if (article.content) {
    const contentLocation = extractFromText(article.content, "low");
    if (contentLocation) {
      addLocation({ ...contentLocation, source: "content" });
    }
  }

  return locations;
}

