"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

/** Browser Supabase client (publishable key, RLS-gated). Singleton per tab. */
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getBrowserSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
