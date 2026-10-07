import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import { authCookieOptions } from "@/lib/db/cookie-options";
import type { Database } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/db/server");

/**
 * Per-request Supabase client acting as the signed-in user (RLS applies).
 * Use in Server Components, Server Actions and Route Handlers.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // Session refresh is handled by middleware.
        }
      },
    },
  });
}
