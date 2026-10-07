"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import type { Database } from "@/lib/db/types";

/** Browser Supabase client (publishable key, RLS-gated). Singleton per tab. */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getBrowserSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
