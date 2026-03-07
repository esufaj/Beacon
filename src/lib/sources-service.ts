import { supabase } from "./supabase";
import type { RssSource as AppRssSource } from "@/types";
import type { PostgrestError } from "@supabase/supabase-js";

function formatSupabaseError(error: PostgrestError): string {
  const parts: string[] = [];
  if (error.message) parts.push(error.message);
  if (error.code) parts.push(`[code: ${error.code}]`);
  if (error.details) parts.push(`[details: ${error.details}]`);
  if (error.hint) parts.push(`[hint: ${error.hint}]`);
  return parts.length > 0 ? parts.join(" ") : "Unknown error";
}

export interface RssSource {
  id: number;
  name: string;
  category: string | null;
  bias_rating: string | null;
}

export async function getAllSources(): Promise<RssSource[]> {
  if (!supabase) return [];
  if (typeof window === "undefined") return [];

  try {
    const { data, error } = await supabase
      .from("rss_sources")
      .select("id, name, category, bias_rating")
      .eq("is_active", true)
      .order("name");

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Beacon] Error fetching sources:", formatSupabaseError(error));
      }
      return [];
    }

    return (data ?? []) as RssSource[];
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Beacon] Unexpected error fetching sources:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
    return [];
  }
}

// Keep type-link to app model as a compile-time guard.
type _EnsureRssSourceCompatibility = AppRssSource | null;

