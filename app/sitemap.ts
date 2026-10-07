import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/config";
import { listCities, listPublishedVendorSlugs } from "@/lib/db/directory";
import { listPublishedEventSlugs } from "@/lib/db/events";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, vendors, events] = await Promise.all([listCities(), listPublishedVendorSlugs(), listPublishedEventSlugs()]);
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
    { url: `${SITE_URL}/guidelines`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
