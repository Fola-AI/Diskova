/** True when a Supabase auth cookie is present (client-side hint only; servers always verify). */
export function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith("sb-") && c.includes("-auth-token"));
}
