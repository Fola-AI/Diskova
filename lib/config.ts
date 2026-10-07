/**
 * Public, non-secret configuration. Safe to import from Client Components.
 *
 * `process.env.NEXT_PUBLIC_*` must be referenced literally so Next.js can inline it at build.
 * Feature flags are not secret; next.config.ts inlines them via `env` so client and server agree.
 * Secrets live in `lib/env.server.ts` and must never be imported here.
 */

const DEFAULT_BRAND_NAME = "Diskova";

/** The brand name. Never hard-code it anywhere else (CLAUDE.md). */
export const BRAND_NAME: string = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || DEFAULT_BRAND_NAME;

/** Season naming (PRD §1.5). */
export const SEASON_NAME = "December in Nigeria";

export interface SiteUrlEnv {
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_VERCEL_URL?: string;
  VERCEL_URL?: string;
}

/**
 * Site URL fallback chain: NEXT_PUBLIC_SITE_URL → https://${VERCEL_URL} → http://localhost:3000.
 * (NEXT_PUBLIC_SITE_URL is unset on Vercel Preview.) Never returns a trailing slash.
 */
export function resolveSiteUrl(env: SiteUrlEnv): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const vercelHost = (env.NEXT_PUBLIC_VERCEL_URL || env.VERCEL_URL)?.trim();
  if (vercelHost) {
    const withProtocol = /^https?:\/\//.test(vercelHost) ? vercelHost : `https://${vercelHost}`;
    return stripTrailingSlash(withProtocol);
  }

  return "http://localhost:3000";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const SITE_URL: string = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
  VERCEL_URL: process.env.VERCEL_URL,
});

export const SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** Publishable key (sb_publishable_…). Safe in the browser; RLS does the gating. */
export const SUPABASE_ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const MAPBOX_TOKEN: string = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
export const SENTRY_DSN: string = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

/** Parse a boolean env flag. Unset/empty → default; anything else must be "true"/"1"/"yes". */
export function parseFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

/** Feature flags (PRD §3.2). */
export const FEATURES = {
  instagramFeed: parseFlag(process.env.FEATURE_INSTAGRAM_FEED, false),
  video: parseFlag(process.env.FEATURE_VIDEO, false),
  aiAssistant: parseFlag(process.env.FEATURE_AI_ASSISTANT, true),
  crowdForecast: parseFlag(process.env.FEATURE_CROWD_FORECAST, true),
  qa: parseFlag(process.env.FEATURE_QA, true),
  points: parseFlag(process.env.FEATURE_POINTS, true),
} as const;

export type FeatureName = keyof typeof FEATURES;

/** Launch cities (PRD §1.4). Source of truth is the `cities` table; this is the fallback order. */
export const DEFAULT_CITY_SLUG = "lagos";
export const DEFAULT_TIMEZONE = "Africa/Lagos";

/** Footer disclaimer (PRD §8.2). */
export const COMMUNITY_DISCLAIMER = `Community posts are shared by individual users and are not verified by ${BRAND_NAME} unless marked Official. See Community Guidelines.`;

/** Label shown on every unverified user-generated post (CLAUDE.md). */
export const UNVERIFIED_LABEL = "Unverified — posted by a community member";

export const BRAND_COLORS = {
  green: "#0B7A3B",
  gold: "#F4B400",
  background: "#0B0F0D",
} as const;

/** Public URL for an object in a public Storage bucket (media / vendor-assets / guides). */
export function publicStorageUrl(bucket: "media" | "vendor-assets" | "guides", path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
