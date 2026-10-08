/**
 * Cookie consent (PRD L13: "cookie consent (analytics only)"). Essential cookies (Supabase auth
 * session) need no consent. Analytics (Vercel Analytics + Speed Insights) load only after "Allow".
 * The choice is a first-party cookie so it also survives across subdomains/tabs; 180 days.
 */
export const CONSENT_COOKIE = "consent";
export type ConsentChoice = "analytics" | "essential";
export const CONSENT_EVENT = "consent:change";

export function readConsent(cookie: string): ConsentChoice | null {
  const m = cookie.match(/(?:^|;\s*)consent=(analytics|essential)(?:;|$)/);
  return (m?.[1] as ConsentChoice | undefined) ?? null;
}

export function consentCookie(choice: ConsentChoice, secure: boolean): string {
  return `${CONSENT_COOKIE}=${choice}; Max-Age=${180 * 24 * 3600}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/**
 * Runs inline in <head> before first paint: marks <html data-consent> when a choice exists (or on
 * admin pages) so CSS hides the server-rendered banner without a flash and without waiting for
 * hydration (a late banner would otherwise become the page's LCP element).
 */
export const CONSENT_BOOT_SCRIPT =
  "try{var m=document.cookie.match(/(?:^|;\\s*)consent=(analytics|essential)(?:;|$)/);" +
  "if(m||location.pathname.indexOf('/admin')===0)document.documentElement.setAttribute('data-consent',m?m[1]:'n/a')}catch(e){}";
