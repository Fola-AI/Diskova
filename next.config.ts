import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

import { buildSecurityHeaders } from "./lib/security/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseHost = (() => {
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Feature flags are not secrets; inline them so client and server read the same values.
  env: {
    FEATURE_INSTAGRAM_FEED: process.env.FEATURE_INSTAGRAM_FEED ?? "",
    FEATURE_VIDEO: process.env.FEATURE_VIDEO ?? "",
    FEATURE_AI_ASSISTANT: process.env.FEATURE_AI_ASSISTANT ?? "",
    FEATURE_CROWD_FORECAST: process.env.FEATURE_CROWD_FORECAST ?? "",
    FEATURE_QA: process.env.FEATURE_QA ?? "",
    FEATURE_POINTS: process.env.FEATURE_POINTS ?? "",
    // Site-URL fallback on Vercel Preview (NEXT_PUBLIC_SITE_URL is unset there).
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL ?? "",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          supabaseUrl,
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          enforceCsp: true, // Enforced from Stage L13 (PRD §7.7)
          isDev: process.env.NODE_ENV !== "production",
        }),
      },
    ];
  },
};

// Sentry project slugs are lowercase; the env value may be capitalised.
const sentryProject = process.env.SENTRY_PROJECT?.toLowerCase();
const uploadSourceMaps = Boolean(process.env.VERCEL && process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: sentryProject,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !uploadSourceMaps },
  webpack: {
    // Replay is OFF (CLAUDE.md) — strip its code from the client bundle entirely.
    treeshake: {
      removeDebugLogging: true,
      excludeReplayIframe: true,
      excludeReplayShadowDOM: true,
      excludeReplayCompressionWorker: true,
    },
  },
  telemetry: false,
});
