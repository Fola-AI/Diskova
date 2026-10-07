import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  // Vercel Preview deployments (DEV data) must never be indexed.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/me", "/vendor", "/api/", "/auth/", "/search", "/preview/", "/reset", "/verify", "/assistant"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
