import type { CookieOptionsWithName } from "@supabase/ssr";

/** PRD §7.3: auth cookies are SameSite=Lax and Secure (except plain-http localhost). */
export function authCookieOptions(): CookieOptionsWithName {
  return {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
