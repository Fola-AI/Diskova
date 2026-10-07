import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import type { Database } from "@/lib/db/types";

/**
 * Cookie-less anonymous client for PUBLIC reads in Server Components / Route Handlers.
 * It never carries a user session, so pages using it stay static / ISR-cacheable and see
 * exactly what an anonymous visitor sees under RLS.
 */
let client: SupabaseClient<Database> | undefined;

export function getPublicSupabase(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
