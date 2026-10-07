import { toZonedTime } from "date-fns-tz";

import { DEFAULT_TIMEZONE, publicStorageUrl } from "@/lib/config";
import { getPublicSupabase } from "@/lib/db/public";
import { blurDataUrl } from "@/lib/media/blur";

/** One live venue on the Tonight view (§8.1), shaped for cards, map and the polling API. */
export interface LiveVenue {
  vendor_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  area_id: string | null;
  category_id: string;
  price_band: string | null;
  verified: boolean;
  lat: number;
  lng: number;
  crowd_level_avg: number;
  confidence: "low" | "medium" | "high";
  post_count: number;
  official_count: number;
  photo_url: string | null;
  photo_blurhash: string | null;
  /** Tiny data URL from the blurhash for next/image `placeholder="blur"`. */
  photo_placeholder?: string;
  last_official_update_at: string | null;
  last_activity_at: string | null;
  /** Heat weight: crowd_level_avg × (post_count + official_count × 3) — §8.1 */
  weight: number;
}

async function fetchCityLive(cityId: string): Promise<LiveVenue[]> {
  const { data, error } = await getPublicSupabase()
    .from("v_live_now")
    .select(
      "vendor_id, slug, name, tagline, area_id, category_id, price_band, verified, cover_image_url, lat, lng, crowd_level_avg, confidence, post_count, official_count, last_photo_path, last_photo_blurhash, last_official_update_at, last_activity_at",
    )
    .eq("city_id", cityId)
    .order("confidence", { ascending: false })
    .order("crowd_level_avg", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const avg = Number(r.crowd_level_avg ?? 0);
    return {
      vendor_id: r.vendor_id!,
      slug: r.slug!,
      name: r.name!,
      tagline: r.tagline,
      area_id: r.area_id,
      category_id: r.category_id!,
      price_band: r.price_band,
      verified: Boolean(r.verified),
      lat: Number(r.lat),
      lng: Number(r.lng),
      crowd_level_avg: avg,
      confidence: (r.confidence ?? "low") as LiveVenue["confidence"],
      post_count: r.post_count ?? 0,
      official_count: r.official_count ?? 0,
      photo_url: r.last_photo_path ? publicStorageUrl("media", r.last_photo_path) : r.cover_image_url,
      photo_blurhash: r.last_photo_blurhash,
      photo_placeholder: blurDataUrl(r.last_photo_blurhash),
      last_official_update_at: r.last_official_update_at,
      last_activity_at: r.last_activity_at,
      weight: avg * ((r.post_count ?? 0) + (r.official_count ?? 0) * 3),
    };
  });
}

/**
 * Not data-cached on the server: stale-while-revalidate would hand stale results to signed-in users
 * who refetch on Realtime events. Anonymous freshness comes from the CDN (s-maxage on /api/live) and
 * page ISR instead.
 */
export function getCityLive(cityId: string): Promise<LiveVenue[]> {
  return fetchCityLive(cityId);
}

/** Latest snapshot for a venue if it is live (≤ 15 min old). */
export async function getVendorLive(vendorId: string) {
  const { data } = await getPublicSupabase()
    .from("crowd_snapshots")
    .select("crowd_level_avg, confidence, post_count, official_count, bucket_start")
    .eq("vendor_id", vendorId)
    .gte("bucket_start", new Date(Date.now() - 15 * 60_000).toISOString())
    .order("bucket_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export interface ForecastLine {
  weekday: number;
  hour: number;
  level: number;
}

/** §6.12: the busiest usual hour today for a venue, once sample_size ≥ 4. */
export async function getVendorForecast(vendorId: string, now = new Date()): Promise<ForecastLine | null> {
  const local = toZonedTime(now, DEFAULT_TIMEZONE);
  const { data } = await getPublicSupabase()
    .from("crowd_forecast")
    .select("weekday, hour, crowd_level_expected, sample_size")
    .eq("vendor_id", vendorId)
    .eq("weekday", local.getDay())
    .gte("sample_size", 4)
    .order("crowd_level_expected", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { weekday: data.weekday, hour: data.hour, level: Number(data.crowd_level_expected) } : null;
}

/** For the Tonight empty state: venues in the city that are usually busy at this hour. */
export async function getUsuallyBusyNow(cityId: string, now = new Date(), limit = 3) {
  const local = toZonedTime(now, DEFAULT_TIMEZONE);
  const { data } = await getPublicSupabase()
    .from("crowd_forecast")
    .select("crowd_level_expected, vendor:vendors!inner(slug, name, city_id, status)")
    .eq("weekday", local.getDay())
    .eq("hour", local.getHours())
    .gte("sample_size", 4)
    .gte("crowd_level_expected", 3)
    .eq("vendor.city_id", cityId)
    .eq("vendor.status", "published")
    .order("crowd_level_expected", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as Array<{ crowd_level_expected: number; vendor: { slug: string; name: string } }>).map((r) => ({
    slug: r.vendor.slug,
    name: r.vendor.name,
    level: Number(r.crowd_level_expected),
  }));
}
