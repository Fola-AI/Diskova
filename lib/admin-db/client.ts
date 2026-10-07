import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/config";
import { requireServerEnv } from "@/lib/env.server";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/admin-db/client");

/**
 * Service-role Supabase client. BYPASSES RLS.
 * Only importable from /lib/admin-db/*, /lib/services/*, Route Handlers, Server Actions and /scripts.
 * Never from /components or any 'use client' file (ESLint + tests enforce this).
 */
let adminClient: SupabaseClient | undefined;

export function getAdminSupabase(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
