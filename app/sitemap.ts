import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/config";
import { listCities, listPublishedVendorSlugs } from "@/lib/db/directory";
import { listPublishedEventSlugs } from "@/lib/db/events";
import { listGuideSitemapEntries } from "@/lib/db/guides";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, vendors, events, guides] = await Promise.all([listCities(), listPublishedVendorSlugs(), listPublishedEventSlugs(), listGuideSitemapEntries()]);
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    ...cities.map((c) => ({
      url: `${SITE_URL}/c/${c.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
    ...vendors.map((v) => ({
      url: `${SITE_URL}/v/${v.slug}`,
      lastModified: new Date(v.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/events`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/events/december`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    ...events.map((e) => ({ url: `${SITE_URL}/events/${e.slug}`, lastModified: new Date(e.updated_at), changeFrequency: "daily" as const, priority: 0.6 })),
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...cities.map((c) => ({ url: `${SITE_URL}/guides/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: `${SITE_URL}/toolkit`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    ...guides.map((g) => ({ url: `${SITE_URL}${g.href}`, lastModified: new Date(g.updated_at), changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/safety`, changeFrequency: "monthly", priority: 0.5 },
    ...cities.map((c) => ({ url: `${SITE_URL}/safety/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: `${SITE_URL}/guidelines`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
