import { createClient } from "@supabase/supabase-js";

import type { SessionContext } from "@/lib/auth/guards";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import type { Database } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/db/bearer");

/**
 * Session from `Authorization: Bearer <Supabase access token>` (public API writes, §9). The token is
 * verified with Supabase Auth (getUser), and the client carries it so RLS applies exactly as for
 * the signed-in web app. No cookies are read or written.
 */
export async function getBearerSession(req: Request): Promise<SessionContext | null> {
  const token = /^Bearer\s+([A-Za-z0-9._-]{20,4096})$/.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!token) return null;
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: rows } = await supabase.rpc("get_my_profile");
  const profile = rows?.[0];
  if (!profile) return null;
  return { supabase: supabase as unknown as SessionContext["supabase"], user: data.user, profile };
}
