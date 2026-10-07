/**
 * Cookie consent (PRD L13: "cookie consent (analytics only)"). Essential cookies (Supabase auth
 * session) need no consent. Analytics (Vercel Analytics + Speed Insights) load only after "Allow".
 * The choice is a first-party cookie so it also survives across subdomains/tabs; 180 days.
 */
export const CONSENT_COOKIE = "consent";
export type ConsentChoice = "analytics" | "essential";
export const CONSENT_EVENT = "consent:change";
export const CONSENT_OPEN_EVENT = "consent:open";

export function readConsent(cookie: string): ConsentChoice | null {
  const m = cookie.match(/(?:^|;\s*)consent=(analytics|essential)(?:;|$)/);
  return (m?.[1] as ConsentChoice | undefined) ?? null;
}

export function consentCookie(choice: ConsentChoice, secure: boolean): string {
  return `${CONSENT_COOKIE}=${choice}; Max-Age=${180 * 24 * 3600}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}
