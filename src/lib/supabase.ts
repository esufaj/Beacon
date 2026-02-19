import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Beacon] Missing Supabase environment variables");
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createSupabaseClient();

export type DbArticle = {
  id: string;
  source_id: number | null;
  guid: string | null;
  article_url: string;
  title: string;
  description: string | null;
  content: string | null;
  author: string | null;
  published_at: string | null;
  image_url: string | null;
  summary: string | null;
  category: string | null;
  location: string | null;
  sentiment: string | null;
  urgency: string | null;
  keywords: string[] | null;
  entities_people: string[] | null;
  entities_organizations: string[] | null;
  entities_locations: string[] | null;
  article_type: string | null;
  target_audience: string | null;
  word_count: number | null;
  reading_time: number | null;
  has_images: boolean | null;
  has_video: boolean | null;
  credibility_score: number | null;
  bias_rating: string | null;
  fact_checkable: boolean | null;
  primary_language: string | null;
  ai_processed: boolean;
  ai_processed_at: string | null;
  source_name: string | null;
  source_type: string | null;
  created_at: string;
  updated_at: string;
  rss_sources?: {
    name: string;
    bias_rating: string | null;
    category: string | null;
  };
};

export type DbRssSource = {
  id: number;
  name: string;
  feed_url: string;
  website_url: string | null;
  bias_rating: string | null;
  category: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  fetch_error: string | null;
  created_at: string;
};
