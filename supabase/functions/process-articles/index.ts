import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const UPSTASH_REDIS_REST_URL = Deno.env.get("UPSTASH_REDIS_REST_URL");
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const TOGETHER_API_KEY = Deno.env.get("TOGETHER_API_KEY");
const FIREWORKS_API_KEY = Deno.env.get("FIREWORKS_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.1-8b-instant";
const OPENROUTER_MODEL =
  Deno.env.get("OPENROUTER_MODEL") ?? "openrouter/free";
const TOGETHER_MODEL =
  Deno.env.get("TOGETHER_MODEL") ?? "meta-llama/Llama-Vision-Free";
const FIREWORKS_MODEL =
  Deno.env.get("FIREWORKS_MODEL") ??
  "accounts/fireworks/models/llama-v3p1-8b-instruct";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-1.5-flash";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL");

const ZSET_KEY = "news:articles:24h:zset";
const HASH_KEY = "news:articles:24h:hash";
const LOCATIONS_KEY = "news:articles:24h:locations";
const META_KEY = "news:articles:24h:meta";

const FATAL_DISABLE_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Types (verbatim from v28)
// ---------------------------------------------------------------------------

interface ArticleToProcess {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  author: string | null;
  category: string | null;
  bias_rating: string | null;
  source_name: string | null;
  source_type: string | null;
  published_at: string | null;
  image_url: string | null;
  article_url: string | null;
  rss_sources: { name: string; bias_rating: string | null } | null;
}

interface AIAnalysis {
  date: string;
  author: string;
  summary: string;
  category: string;
  location: string;
  sentiment: string;
  urgency: string;
  keywords: string[];
  entities: {
    people: string[];
    organizations: string[];
    locations: string[];
  };
  article_type: string;
  target_audience: string;
  word_count: number;
  reading_time: number;
  has_images: boolean;
  has_video: boolean;
  credibility_score: number;
  bias_rating: string;
  fact_checkable: boolean;
  primary_language: string;
}

type ProviderResult = {
  content: string | null;
  errorType: "rate_limit" | "fatal" | null;
  status?: number;
};

type ProviderConfig = {
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  format: "openai" | "gemini" | "anthropic";
};

type ProviderStats = {
  attempts: number;
  successes: number;
  rate_limited: number;
  fatal: number;
  empty: number;
  invalid_json: number;
  json_parse_error: number;
  rate_limit_statuses: Record<string, number>;
  fatal_statuses: Record<string, number>;
};

interface EnrichedArticle {
  id: string;
  headline: string;
  summary: string;
  content: string;
  location: {
    name: string;
    lat: number;
    lng: number;
    country: string;
    region: string;
  };
  category: string;
  timestamp: string;
  source: string;
  imageUrl: string | null;
  url: string | null;
  credibilityScore: number | null;
  biasRating: string | null;
  sentiment: string | null;
  urgency: string | null;
  readingTime: number | null;
  wordCount: number | null;
  keywords: string[];
  entitiesPeople: string[];
  entitiesOrganizations: string[];
  entitiesLocations: string[];
  articleType: string | null;
  targetAudience: string | null;
}

interface PgmqMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: {
    article_id: string;
    attempt: number;
  };
}

// ---------------------------------------------------------------------------
// Constants (verbatim from v28)
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, string> = {
  politics: "Politics",
  business: "Business",
  technology: "Technology",
  science: "Science",
  health: "Health",
  sports: "Sports",
  entertainment: "Entertainment",
  world: "World",
  crime: "Crime",
  environment: "Environment",
  education: "Education",
  other: "Other",
};

const BIAS_VALUES = new Set([
  "left",
  "center-left",
  "center",
  "center-right",
  "right",
]);

const SENTIMENT_VALUES = new Set([
  "positive",
  "negative",
  "neutral",
  "mixed",
]);

const URGENCY_VALUES = new Set(["critical", "high", "medium", "low"]);

const ARTICLE_TYPE_MAP: Record<string, string> = {
  breaking_news: "breaking_news",
  breaking: "breaking_news",
  news: "breaking_news",
  analysis: "analysis",
  opinion: "opinion",
  oped: "opinion",
  "op-ed": "opinion",
  investigative: "investigative",
  feature: "feature",
  interview: "interview",
  review: "review",
  press_release: "analysis",
  pressrelease: "analysis",
};

const TARGET_AUDIENCE_VALUES = new Set([
  "general",
  "business",
  "technical",
  "academic",
  "local",
]);

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

const MULTI_LOCATION_SPLIT_REGEX = /[\/|;]/;

const providerState = new Map<string, "available" | "rate_limited">();

// ---------------------------------------------------------------------------
// Normalization functions (verbatim from v28)
// ---------------------------------------------------------------------------

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCategory(value: unknown, fallback: string | null): string | null {
  const normalized = normalizeText(value)?.toLowerCase();
  if (normalized && CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];
  const fallbackNormalized = normalizeText(fallback)?.toLowerCase();
  return fallbackNormalized && CATEGORY_MAP[fallbackNormalized]
    ? CATEGORY_MAP[fallbackNormalized]
    : null;
}

function normalizeBias(value: unknown, fallback: string | null): string | null {
  const normalized = normalizeText(value)?.toLowerCase();
  if (normalized && BIAS_VALUES.has(normalized)) return normalized;
  const fallbackNormalized = normalizeText(fallback)?.toLowerCase();
  return fallbackNormalized && BIAS_VALUES.has(fallbackNormalized)
    ? fallbackNormalized
    : null;
}

function normalizeSentiment(value: unknown): string | null {
  const normalized = normalizeText(value)?.toLowerCase();
  return normalized && SENTIMENT_VALUES.has(normalized) ? normalized : null;
}

function normalizeUrgency(value: unknown): string | null {
  const normalized = normalizeText(value)?.toLowerCase();
  return normalized && URGENCY_VALUES.has(normalized) ? normalized : null;
}

function normalizeArticleType(value: unknown): string | null {
  const normalized = normalizeText(value)?.toLowerCase().replace(/\s+/g, "_");
  if (!normalized) return null;
  return ARTICLE_TYPE_MAP[normalized] ?? null;
}

function normalizeTargetAudience(value: unknown): string | null {
  const normalized = normalizeText(value)?.toLowerCase();
  return normalized && TARGET_AUDIENCE_VALUES.has(normalized)
    ? normalized
    : null;
}

function normalizeNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCredibilityScore(value: unknown): number | null {
  const parsed = normalizeNumber(value);
  if (parsed === null) return null;
  const rounded = Math.round(parsed);
  return Math.min(10, Math.max(1, rounded));
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item)))
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
}

function sanitizeLocation(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
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
  return value;
}

function pickLocation(analysis: AIAnalysis): string {
  const primary = sanitizeLocation(analysis.location);
  if (primary) return primary;

  const entities = normalizeStringArray(analysis.entities?.locations ?? []);
  for (const loc of entities) {
    const candidate = sanitizeLocation(loc);
    if (candidate) return candidate;
  }

  return "Unknown";
}

// ---------------------------------------------------------------------------
// Provider config (verbatim from v28)
// ---------------------------------------------------------------------------

function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  if (OPENROUTER_API_KEY && OPENROUTER_MODEL) {
    providers.push({
      name: "openrouter",
      apiKey: OPENROUTER_API_KEY,
      baseUrl: "https://openrouter.ai/api/v1",
      model: OPENROUTER_MODEL,
      format: "openai",
    });
  }

  if (GROQ_API_KEY) {
    providers.push({
      name: "groq",
      apiKey: GROQ_API_KEY,
      baseUrl: "https://api.groq.com/openai/v1",
      model: GROQ_MODEL,
      format: "openai",
    });
  }

  if (GEMINI_API_KEY && GEMINI_MODEL) {
    providers.push({
      name: "gemini",
      apiKey: GEMINI_API_KEY,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: GEMINI_MODEL,
      format: "gemini",
    });
  }

  if (TOGETHER_API_KEY && TOGETHER_MODEL) {
    providers.push({
      name: "together",
      apiKey: TOGETHER_API_KEY,
      baseUrl: "https://api.together.xyz/v1",
      model: TOGETHER_MODEL,
      format: "openai",
    });
  }

  if (FIREWORKS_API_KEY && FIREWORKS_MODEL) {
    providers.push({
      name: "fireworks",
      apiKey: FIREWORKS_API_KEY,
      baseUrl: "https://api.fireworks.ai/inference/v1",
      model: FIREWORKS_MODEL,
      format: "openai",
    });
  }

  if (OPENAI_API_KEY && OPENAI_MODEL) {
    providers.push({
      name: "openai",
      apiKey: OPENAI_API_KEY,
      baseUrl: "https://api.openai.com/v1",
      model: OPENAI_MODEL,
      format: "openai",
    });
  }

  if (ANTHROPIC_API_KEY && ANTHROPIC_MODEL) {
    providers.push({
      name: "anthropic",
      apiKey: ANTHROPIC_API_KEY,
      baseUrl: "https://api.anthropic.com/v1",
      model: ANTHROPIC_MODEL,
      format: "anthropic",
    });
  }

  return providers;
}

// ---------------------------------------------------------------------------
// Provider stats helpers (verbatim from v28)
// ---------------------------------------------------------------------------

function getProviderStats(
  stats: Map<string, ProviderStats>,
  name: string
): ProviderStats {
  const existing = stats.get(name);
  if (existing) return existing;
  const next: ProviderStats = {
    attempts: 0,
    successes: 0,
    rate_limited: 0,
    fatal: 0,
    empty: 0,
    invalid_json: 0,
    json_parse_error: 0,
    rate_limit_statuses: {},
    fatal_statuses: {},
  };
  stats.set(name, next);
  return next;
}

function incrementStatusCounter(
  target: Record<string, number>,
  status?: number
) {
  const key = status ? String(status) : "unknown";
  target[key] = (target[key] ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// AI provider call functions (verbatim from v28)
// ---------------------------------------------------------------------------

async function callOpenAICompatible(
  provider: ProviderConfig,
  prompt: string
): Promise<ProviderResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${provider.apiKey}`,
  };

  if (provider.name === "openrouter") {
    headers["HTTP-Referer"] = "https://beacon.app";
    headers["X-Title"] = "Beacon";
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1200,
    }),
  });

  if (response.status === 429 || response.status === 403) {
    return { content: null, errorType: "rate_limit", status: response.status };
  }

  if (!response.ok) {
    console.error(`[AI] ${provider.name} error: ${response.status}`);
    return { content: null, errorType: "fatal", status: response.status };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return { content: content ?? null, errorType: null };
}

async function callGemini(
  provider: ProviderConfig,
  prompt: string
): Promise<ProviderResult> {
  const response = await fetch(
    `${provider.baseUrl}/models/${provider.model}:generateContent?key=${provider.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
      }),
    }
  );

  if (response.status === 429 || response.status === 403) {
    return { content: null, errorType: "rate_limit", status: response.status };
  }

  if (!response.ok) {
    console.error(`[AI] gemini error: ${response.status}`);
    return { content: null, errorType: "fatal", status: response.status };
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return { content: content ?? null, errorType: null };
}

async function callAnthropic(
  provider: ProviderConfig,
  prompt: string
): Promise<ProviderResult> {
  const response = await fetch(`${provider.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1200,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (response.status === 429 || response.status === 403) {
    return { content: null, errorType: "rate_limit", status: response.status };
  }

  if (!response.ok) {
    console.error(`[AI] anthropic error: ${response.status}`);
    return { content: null, errorType: "fatal", status: response.status };
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  return { content: content ?? null, errorType: null };
}

// ---------------------------------------------------------------------------
// analyzeWithProviders (verbatim from v28)
// ---------------------------------------------------------------------------

async function analyzeWithProviders(
  prompt: string,
  providers: ProviderConfig[],
  providerStats: Map<string, ProviderStats>
): Promise<AIAnalysis | null> {
  for (const provider of providers) {
    if (providerState.get(provider.name) === "rate_limited") {
      continue;
    }

    const stats = getProviderStats(providerStats, provider.name);
    stats.attempts += 1;

    let result: ProviderResult;

    if (provider.format === "openai") {
      result = await callOpenAICompatible(provider, prompt);
    } else if (provider.format === "gemini") {
      result = await callGemini(provider, prompt);
    } else {
      result = await callAnthropic(provider, prompt);
    }

    if (result.errorType === "rate_limit") {
      stats.rate_limited += 1;
      incrementStatusCounter(stats.rate_limit_statuses, result.status);
      providerState.set(provider.name, "rate_limited");
      continue;
    }

    if (result.errorType === "fatal") {
      stats.fatal += 1;
      incrementStatusCounter(stats.fatal_statuses, result.status);
      if (stats.fatal >= FATAL_DISABLE_THRESHOLD) {
        providerState.set(provider.name, "rate_limited");
      }
      continue;
    }

    if (!result.content) {
      stats.empty += 1;
      continue;
    }

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      stats.invalid_json += 1;
      console.warn(`[AI] ${provider.name} returned invalid JSON`);
      continue;
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as AIAnalysis;
      stats.successes += 1;
      return parsed;
    } catch (error) {
      stats.json_parse_error += 1;
      console.warn(`[AI] ${provider.name} JSON parse error`, error);
      continue;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// buildPrompt (verbatim from v28)
// ---------------------------------------------------------------------------

function buildPrompt(article: ArticleToProcess): string {
  const articleContent = article.content || article.description || "";
  const sourceName =
    article.source_name || article.rss_sources?.name || article.source_type || "Unknown";

  return `You are an expert news article analyzer. Your task is to extract structured data from the article below.

Article Title: ${article.title}
Article Content: ${articleContent.slice(0, 6000)}
Source: ${sourceName}

=== CRITICAL: LOCATION INFERENCE RULES ===

You MUST return exactly ONE Earth location. Never return multiple locations or lists.

1. EXPLICIT LOCATIONS: If a city, state, or country is directly mentioned, use the PRIMARY location where the story happens.
2. INFERRED LOCATIONS: If no explicit location, infer from organizations, teams, landmarks, or institutions described.
3. If multiple locations are mentioned, choose the single most central location to the story.
4. DO NOT output separators like "/", "and", ";", "|", or multiple places.
5. NEVER return "Earth" or non‑Earth places (e.g., "Mars").
6. NEVER return event names. If you cannot identify a real place, use "Unknown".
7. ONLY use "Unknown" if there is absolutely NO geographic context.

(Use the following inference hints when relevant.)

SPORTS TEAMS - Infer location from team headquarters/stadium:
NFL: Washington Commanders → Landover, Maryland | Dallas Cowboys → Arlington, Texas | New England Patriots → Foxborough, Massachusetts | Los Angeles Rams/Chargers → Los Angeles, California | New York Giants/Jets → East Rutherford, New Jersey | Chicago Bears → Chicago, Illinois | Green Bay Packers → Green Bay, Wisconsin | San Francisco 49ers → Santa Clara, California | Seattle Seahawks → Seattle, Washington | Miami Dolphins → Miami Gardens, Florida | Philadelphia Eagles → Philadelphia, Pennsylvania | Baltimore Ravens → Baltimore, Maryland | Kansas City Chiefs → Kansas City, Missouri | Denver Broncos → Denver, Colorado | Las Vegas Raiders → Las Vegas, Nevada | Arizona Cardinals → Glendale, Arizona
NBA: Lakers/Clippers → Los Angeles | Bulls → Chicago | Celtics → Boston | Knicks/Nets → New York City | Warriors → San Francisco | Heat → Miami | Mavericks → Dallas | Spurs → San Antonio | Suns → Phoenix | 76ers → Philadelphia | Raptors → Toronto, Canada | Bucks → Milwaukee
MLB: Yankees/Mets → New York City | Red Sox → Boston | Dodgers → Los Angeles | Cubs/White Sox → Chicago | Giants → San Francisco | Astros → Houston | Rangers → Arlington, Texas | Cardinals → St. Louis | Braves → Atlanta | Phillies → Philadelphia
NHL: Maple Leafs → Toronto | Canadiens → Montreal | Bruins → Boston | Rangers → New York City | Blackhawks → Chicago | Kings → Los Angeles | Penguins → Pittsburgh | Red Wings → Detroit
Soccer: Manchester United/City → Manchester, UK | Liverpool → Liverpool, UK | Chelsea/Arsenal/Tottenham → London, UK | Barcelona → Barcelona, Spain | Real Madrid → Madrid, Spain | Bayern Munich → Munich, Germany | PSG → Paris, France | Juventus/AC Milan/Inter Milan → Milan/Turin, Italy

MAJOR COMPANIES - Use corporate headquarters:
Apple → Cupertino, California | Google/Alphabet → Mountain View, California | Meta/Facebook → Menlo Park, California | Microsoft → Redmond, Washington | Amazon → Seattle, Washington | Tesla → Austin, Texas | Netflix → Los Gatos, California | Nvidia → Santa Clara, California | OpenAI → San Francisco, California | Twitter/X → San Francisco, California | Uber → San Francisco, California | Airbnb → San Francisco, California | Salesforce → San Francisco, California | Oracle → Austin, Texas | Intel → Santa Clara, California | IBM → Armonk, New York | JPMorgan Chase → New York City | Goldman Sachs → New York City | Morgan Stanley → New York City | Bank of America → Charlotte, North Carolina | Citigroup → New York City | Wells Fargo → San Francisco, California | Walmart → Bentonville, Arkansas | Target → Minneapolis, Minnesota | Coca-Cola → Atlanta, Georgia | Disney → Burbank, California | Warner Bros → Burbank, California | Universal → Universal City, California | Boeing → Arlington, Virginia | Lockheed Martin → Bethesda, Maryland | ExxonMobil → Spring, Texas | Chevron → San Ramon, California | Ford → Dearborn, Michigan | General Motors → Detroit, Michigan | Toyota (US) → Plano, Texas | Samsung (US) → San Jose, California

GOVERNMENT & POLITICS:
White House/President/Oval Office → Washington, DC | Congress/Senate/House of Representatives/Capitol Hill → Washington, DC | Pentagon/Department of Defense → Arlington, Virginia | State Department → Washington, DC | FBI → Washington, DC | CIA → Langley, Virginia | Federal Reserve → Washington, DC | Supreme Court → Washington, DC | United Nations/UN → New York City | NATO headquarters → Brussels, Belgium | European Union/European Commission → Brussels, Belgium | European Parliament → Strasbourg, France or Brussels, Belgium | WHO → Geneva, Switzerland | IMF/World Bank → Washington, DC | British Parliament/10 Downing Street → London, UK | Élysée Palace → Paris, France | Kremlin → Moscow, Russia | Zhongnanhai → Beijing, China

UNIVERSITIES - Use campus location:
Harvard → Cambridge, Massachusetts | MIT → Cambridge, Massachusetts | Stanford → Stanford, California | Yale → New Haven, Connecticut | Princeton → Princeton, New Jersey | Columbia → New York City | NYU → New York City | University of Chicago → Chicago, Illinois | UC Berkeley → Berkeley, California | UCLA → Los Angeles, California | Caltech → Pasadena, California | Duke → Durham, North Carolina | Northwestern → Evanston, Illinois | Carnegie Mellon → Pittsburgh, Pennsylvania | University of Michigan → Ann Arbor, Michigan | University of Texas → Austin, Texas | Georgia Tech → Atlanta, Georgia | Oxford → Oxford, UK | Cambridge → Cambridge, UK

LANDMARKS & REGIONS:
Wall Street/NYSE/NASDAQ → New York City | Silicon Valley → San Francisco Bay Area, California | Hollywood → Los Angeles, California | Broadway → New York City | Times Square → New York City | Central Park → New York City | Golden Gate Bridge → San Francisco, California | Statue of Liberty → New York City | Eiffel Tower → Paris, France | Big Ben/Westminster → London, UK | Buckingham Palace → London, UK | Vatican → Vatican City | Colosseum → Rome, Italy | Kremlin → Moscow, Russia | Great Wall → Beijing, China | Sydney Opera House → Sydney, Australia | Taj Mahal → Agra, India

MEDIA OUTLETS - Use headquarters:
New York Times/Wall Street Journal/CNN → New York City | Washington Post/Politico → Washington, DC | Los Angeles Times → Los Angeles, California | Chicago Tribune → Chicago, Illinois | BBC → London, UK | The Guardian → London, UK | Reuters → London, UK | Al Jazeera → Doha, Qatar | CNBC/NBC → New York City | Fox News → New York City

FAMOUS INDIVIDUALS - Use primary residence/workplace:
Elon Musk → Austin, Texas | Tim Cook → Cupertino, California | Mark Zuckerberg → Palo Alto, California | Jeff Bezos → Seattle, Washington | Bill Gates → Medina, Washington | Warren Buffett → Omaha, Nebraska | The Pope → Vatican City | British Royal Family → London, UK

=== LOCATION FORMAT ===
- US locations: "City, State" (e.g., "San Francisco, California")
- International: "City, Country" (e.g., "London, UK")
- ONLY use "Unknown" if there is absolutely NO geographic context.

=== CREDIBILITY SCORING RUBRIC (1-10) ===
- 9-10: Multiple named sources, official documents/data, clear dates/figures, highly verifiable.
- 7-8: Reputable outlet, some named sources or evidence, mostly verifiable but limited detail.
- 5-6: Mixed sourcing, vague attribution, fewer hard details.
- 3-4: Sensational or speculative, unclear sourcing.
- 1-2: Unverified claims/rumors, no credible sourcing.
Avoid defaulting to 8—choose based on evidence in the article.

=== BIAS RATING GUIDANCE ===
- left: progressive framing, emphasis on social equity or critique of conservative policies
- center-left: mildly progressive, mixed tone, some market skepticism
- center: neutral framing, balanced perspectives, minimal loaded language
- center-right: mildly conservative, market-friendly framing, institutional trust
- right: conservative framing, strong market/individual emphasis, critique of progressive policy
Do not default to center; choose the closest fit based on tone and framing.

=== TARGET AUDIENCE GUIDANCE ===
- general: broad public interest
- business: finance/markets, corporate strategy, economics
- technical: engineering, software, scientific/technical depth
- academic: research-heavy, citations, scholarly tone
- local: city/region-specific focus

=== OUTPUT FORMAT ===
Return ONLY a valid JSON object with this exact structure:
{
  "date": "YYYY-MM-DD or 'unknown'",
  "author": "author name or 'unknown'",
  "summary": "2-3 sentence summary without HTML",
  "category": "Politics|Business|Technology|Science|Health|Sports|Entertainment|World|Crime|Environment|Education|Other",
  "location": "City, State/Country (single Earth location)",
  "sentiment": "positive|negative|neutral|mixed",
  "urgency": "critical|high|medium|low",
  "keywords": ["5-7 relevant keywords"],
  "entities": {
    "people": ["names of people mentioned"],
    "organizations": ["companies, agencies, teams, groups"],
    "locations": ["all locations mentioned in article"]
  },
  "article_type": "breaking_news|analysis|opinion|investigative|feature|interview|review",
  "target_audience": "general|business|technical|academic|local",
  "word_count": integer,
  "reading_time": integer,
  "has_images": boolean,
  "has_video": boolean,
  "credibility_score": 1-10,
  "bias_rating": "left|center-left|center|center-right|right",
  "fact_checkable": boolean,
  "primary_language": "language name"
}

IMPORTANT: Return ONLY the JSON object, no other text.`;
}

// ---------------------------------------------------------------------------
// processArticle — AI analysis + DB write, returns enriched data on success
// ---------------------------------------------------------------------------

async function processArticle(
  article: ArticleToProcess,
  providers: ProviderConfig[],
  providerStats: Map<string, ProviderStats>
): Promise<EnrichedArticle | null> {
  const prompt = buildPrompt(article);
  const analysis = await analyzeWithProviders(prompt, providers, providerStats);
  if (!analysis) return null;

  const summary =
    normalizeText(analysis.summary) ||
    normalizeText(article.description) ||
    normalizeText(article.content) ||
    "";

  const category = normalizeCategory(analysis.category, article.category) || "Other";
  const location = pickLocation(analysis);
  const sentiment = normalizeSentiment(analysis.sentiment);
  const urgency = normalizeUrgency(analysis.urgency);
  const keywords = normalizeStringArray(analysis.keywords);
  const entitiesPeople = normalizeStringArray(analysis.entities?.people ?? []);
  const entitiesOrganizations = normalizeStringArray(
    analysis.entities?.organizations ?? []
  );
  const entitiesLocations = normalizeStringArray(analysis.entities?.locations ?? []);
  const articleType = normalizeArticleType(analysis.article_type);
  const targetAudience = normalizeTargetAudience(analysis.target_audience);
  const wordCount = normalizeNumber(analysis.word_count);
  const readingTime = normalizeNumber(analysis.reading_time);
  const hasImages = normalizeBoolean(analysis.has_images);
  const hasVideo = normalizeBoolean(analysis.has_video);
  const credibilityScore = normalizeCredibilityScore(analysis.credibility_score);
  const biasRating = normalizeBias(
    analysis.bias_rating,
    article.rss_sources?.bias_rating || article.bias_rating
  );
  const factCheckable = normalizeBoolean(analysis.fact_checkable);
  const primaryLanguage = normalizeText(analysis.primary_language);
  const author = normalizeText(analysis.author);

  const updatePayload: Record<string, unknown> = {
    summary,
    category,
    location,
    sentiment,
    urgency,
    keywords: keywords.length > 0 ? keywords : null,
    entities_people: entitiesPeople.length > 0 ? entitiesPeople : null,
    entities_organizations: entitiesOrganizations.length > 0 ? entitiesOrganizations : null,
    entities_locations: entitiesLocations.length > 0 ? entitiesLocations : null,
    article_type: articleType,
    target_audience: targetAudience,
    word_count: wordCount,
    reading_time: readingTime,
    has_images: hasImages,
    has_video: hasVideo,
    credibility_score: credibilityScore ?? null,
    bias_rating: biasRating,
    fact_checkable: factCheckable,
    primary_language: primaryLanguage,
    ai_processed: true,
    ai_processed_at: new Date().toISOString(),
  };

  if (!article.author && author && author.toLowerCase() !== "unknown") {
    updatePayload.author = author;
  }

  const { error } = await supabase
    .from("articles")
    .update(updatePayload)
    .eq("id", article.id);

  if (error) {
    console.error(`[AI] DB write failed for ${article.id}:`, error.message);
    return null;
  }

  const sourceName =
    article.source_name || article.rss_sources?.name || article.source_type || "Unknown";

  return {
    id: article.id,
    headline: article.title,
    summary,
    content: article.content || article.description || "",
    location: {
      name: location,
      lat: 0,
      lng: 0,
      country: "Unknown",
      region: "Unknown",
    },
    category,
    timestamp: article.published_at || new Date().toISOString(),
    source: sourceName,
    imageUrl: article.image_url || null,
    url: article.article_url || null,
    credibilityScore: credibilityScore ?? null,
    biasRating: biasRating ?? null,
    sentiment: sentiment ?? null,
    urgency: urgency ?? null,
    readingTime: readingTime ?? null,
    wordCount: wordCount ?? null,
    keywords,
    entitiesPeople,
    entitiesOrganizations,
    entitiesLocations,
    articleType: articleType ?? null,
    targetAudience: targetAudience ?? null,
  };
}

// ---------------------------------------------------------------------------
// Redis write-through via Upstash REST pipeline
// ---------------------------------------------------------------------------

async function writeToRedis(enriched: EnrichedArticle): Promise<void> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return;

  const score = new Date(enriched.timestamp).getTime();
  const serialized = JSON.stringify({
    ...enriched,
    timestamp: enriched.timestamp,
  });

  const locationPayload = JSON.stringify({
    name: enriched.location.name,
    lat: enriched.location.lat,
    lng: enriched.location.lng,
    country: enriched.location.country,
    region: enriched.location.region,
  });

  const pipeline = [
    ["ZADD", ZSET_KEY, String(score), enriched.id],
    ["HSET", HASH_KEY, enriched.id, serialized],
    ["HSET", LOCATIONS_KEY, enriched.location.name, locationPayload],
    ["HINCRBY", META_KEY, "totalCount", "1"],
  ];

  try {
    const resp = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });

    if (!resp.ok) {
      console.error(`[Redis] Pipeline failed: ${resp.status}`);
      return;
    }

    const maxPipeline = [
      ["HGET", META_KEY, "maxPublishedAt"],
    ];

    const maxResp = await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(maxPipeline),
    });

    if (maxResp.ok) {
      const maxData = await maxResp.json();
      const currentMax = maxData?.[0]?.result
        ? new Date(maxData[0].result).getTime()
        : 0;

      if (score > currentMax) {
        await fetch(`${UPSTASH_REDIS_REST_URL}/pipeline`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            ["HSET", META_KEY, "maxPublishedAt", enriched.timestamp],
          ]),
        });
      }
    }
  } catch (error) {
    console.error("[Redis] Write-through failed:", error);
  }
}

// ---------------------------------------------------------------------------
// Supabase Realtime broadcast
// ---------------------------------------------------------------------------

async function broadcastArticle(enriched: EnrichedArticle): Promise<void> {
  try {
    const resp = await fetch(
      `${SUPABASE_URL}/realtime/v1/api/broadcast`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              topic: "article-ready",
              event: "article_ready",
              payload: {
                article: enriched,
                cachedAt: Date.now(),
              },
            },
          ],
        }),
      }
    );

    if (!resp.ok) {
      console.error(`[Broadcast] Failed: ${resp.status}`);
    }
  } catch (error) {
    console.error("[Broadcast] Error:", error);
  }
}

// ---------------------------------------------------------------------------
// pgmq helpers
// ---------------------------------------------------------------------------

async function readQueue(
  limit: number,
  visibilityTimeout: number
): Promise<PgmqMessage[]> {
  const { data, error } = await supabase.rpc("pgmq_read", {
    queue_name: "ai_processing",
    vt: visibilityTimeout,
    qty: limit,
  });

  if (error) {
    console.error("[pgmq] Read error:", error.message);
    return [];
  }

  return (data ?? []) as PgmqMessage[];
}

async function deleteMessage(msgId: number): Promise<void> {
  const { error } = await supabase.rpc("pgmq_delete", {
    queue_name: "ai_processing",
    msg_id: msgId,
  });

  if (error) {
    console.error(`[pgmq] Delete error for msg ${msgId}:`, error.message);
  }
}

async function archiveToDLQ(msgId: number): Promise<void> {
  const { error } = await supabase.rpc("pgmq_archive", {
    queue_name: "ai_processing",
    msg_id: msgId,
  });

  if (error) {
    console.error(`[pgmq] Archive (DLQ) error for msg ${msgId}:`, error.message);
  }
}

// ---------------------------------------------------------------------------
// Deno.serve handler — poll pgmq, process, fan out to Redis + Realtime
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request) => {
  const startTime = Date.now();

  providerState.clear();
  const providers = getProviders();
  const providerStats = new Map<string, ProviderStats>();

  if (providers.length === 0) {
    return new Response(
      JSON.stringify({ error: "No AI providers configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("[AI] Starting pgmq-driven run", {
    providers: providers.map((p) => ({ name: p.name, model: p.model })),
  });

  const messages = await readQueue(10, 30);

  if (messages.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        processed: 0,
        failed: 0,
        skipped: 0,
        duration_ms: Date.now() - startTime,
        message: "No jobs in queue",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[AI] Dequeued ${messages.length} jobs`);

  let totalProcessed = 0;
  let totalFailed = 0;
  let totalDLQ = 0;

  const results = await Promise.all(
    messages.map(async (msg) => {
      const articleId = msg.message?.article_id;
      const attempt = msg.message?.attempt ?? 1;

      if (!articleId) {
        console.warn(`[AI] Malformed message ${msg.msg_id}, archiving`);
        await archiveToDLQ(msg.msg_id);
        return { status: "dlq" as const };
      }

      const { data: article, error: fetchError } = await supabase
        .from("articles")
        .select(
          `id, title, description, content, author, category, bias_rating,
           source_name, source_type, published_at, image_url, article_url,
           rss_sources (name, bias_rating)`
        )
        .eq("id", articleId)
        .single();

      if (fetchError || !article || !article.title) {
        console.warn(
          `[AI] Article ${articleId} not found or untitled, archiving msg ${msg.msg_id}`
        );
        await archiveToDLQ(msg.msg_id);
        return { status: "dlq" as const };
      }

      const enriched = await processArticle(
        article as ArticleToProcess,
        providers,
        providerStats
      );

      if (enriched) {
        await Promise.all([
          writeToRedis(enriched),
          broadcastArticle(enriched),
        ]);

        await deleteMessage(msg.msg_id);
        return { status: "success" as const };
      }

      if (attempt >= 3) {
        console.warn(
          `[AI] Article ${articleId} failed after ${attempt} attempts, archiving to DLQ`
        );
        await archiveToDLQ(msg.msg_id);
        return { status: "dlq" as const };
      }

      console.log(
        `[AI] Article ${articleId} attempt ${attempt} failed, will retry after visibility timeout`
      );
      return { status: "retry" as const };
    })
  );

  for (const r of results) {
    if (r.status === "success") totalProcessed++;
    else if (r.status === "dlq") totalDLQ++;
    else totalFailed++;
  }

  const duration = Date.now() - startTime;
  const providerStatsObj = Object.fromEntries(providerStats.entries());

  console.log("[AI] Run summary", {
    processed: totalProcessed,
    failed: totalFailed,
    dlq: totalDLQ,
    duration_ms: duration,
    provider_stats: providerStatsObj,
  });

  return new Response(
    JSON.stringify({
      success: true,
      processed: totalProcessed,
      failed: totalFailed,
      dlq: totalDLQ,
      duration_ms: duration,
      provider_stats: providerStatsObj,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
