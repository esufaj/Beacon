const HOSTNAME_OVERRIDES: Record<string, string> = {
  "nytimes.com": "The New York Times",
  "washingtonpost.com": "The Washington Post",
  "wsj.com": "The Wall Street Journal",
  "bbc.co.uk": "BBC",
  "bbc.com": "BBC",
  "cnn.com": "CNN",
  "foxnews.com": "Fox News",
  "apnews.com": "Associated Press",
  "reuters.com": "Reuters",
};

const SECOND_LEVEL_TLDS = new Set(["co.uk", "com.au", "co.nz", "co.in"]);

const ACRONYM_OVERRIDES = new Set([
  "bbc",
  "cnn",
  "cnbc",
  "abc",
  "nbc",
  "cbs",
  "msnbc",
  "ap",
  "npr",
  "wsj",
  "ft",
  "usa",
]);

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYM_OVERRIDES.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function inferSourceFromUrl(articleUrl?: string | null): string | null {
  if (!articleUrl) return null;
  try {
    const hostname = new URL(articleUrl).hostname.replace(/^www\./i, "");
    const lowerHost = hostname.toLowerCase();
    if (HOSTNAME_OVERRIDES[lowerHost]) return HOSTNAME_OVERRIDES[lowerHost];

    const parts = lowerHost.split(".");
    if (parts.length < 2) return null;

    const lastTwo = parts.slice(-2).join(".");
    const label = SECOND_LEVEL_TLDS.has(lastTwo)
      ? parts[parts.length - 3]
      : parts[parts.length - 2];

    if (!label) return null;
    return toTitleCase(label.replace(/-/g, " "));
  } catch {
    return null;
  }
}

export function formatSourceName(
  sourceName?: string | null,
  sourceType?: string | null,
  articleUrl?: string | null
): string {
  if (sourceName && sourceName.trim().length > 0) {
    return sourceName.trim();
  }
  const inferred = inferSourceFromUrl(articleUrl);
  if (inferred) return inferred;
  return "Unknown";
}
