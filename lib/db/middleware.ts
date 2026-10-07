import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import { authCookieOptions } from "@/lib/db/cookie-options";
import type { Database } from "@/lib/db/types";

/** Route prefixes that need a signed-in user. Role / MFA checks happen in server guards. */
export const PROTECTED_PREFIXES = ["/me", "/vendor", "/admin"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function loginRedirect(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

/**
 * Refreshes the Supabase session cookie on each request (so Server Components see a valid token)
 * and bounces anonymous visitors away from protected areas. Visitors with no auth cookie skip the
 * Auth round-trip entirely, keeping public pages fast.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  const protectedPath = isProtectedPath(request.nextUrl.pathname);

  // Forward the requested path so server guards in layouts can build an accurate `next` redirect.
  const forwarded = new Headers(request.headers);
  forwarded.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  const next = () => NextResponse.next({ request: { headers: forwarded } });

  if (!hasAuthCookie) {
    return protectedPath ? loginRedirect(request) : next();
  }

  let response = next();
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        forwarded.set("cookie", request.cookies.toString());
        response = next();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Do not put code between createServerClient and getUser (per @supabase/ssr guidance).
  const { data } = await supabase.auth.getUser();

  if (!data.user && protectedPath) {
    const redirect = loginRedirect(request);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }
  return response;
}
