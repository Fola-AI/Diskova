import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/config";
import type { Database } from "@/lib/db/types";
import { requireServerEnv } from "@/lib/env.server";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/admin-db/client");

/**
 * Service-role Supabase client. BYPASSES RLS.
 * Only importable from /lib/admin-db/*, /lib/services/*, Route Handlers, Server Actions and /scripts.
 * Never from /components or any 'use client' file (ESLint + tests enforce this).
 */
export type AdminClient = SupabaseClient<Database>;

let adminClient: AdminClient | undefined;

export function getAdminSupabase(): AdminClient {
  if (!adminClient) {
    adminClient = createClient<Database>(SUPABASE_URL, requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
