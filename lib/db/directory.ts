import { cache } from "react";

import { getPublicSupabase } from "@/lib/db/public";
import type { Database } from "@/lib/db/types";
import type { PriceBand } from "@/lib/directory/constants";

/** Read-only directory queries (anonymous view under RLS: published content only). */

type Tables = Database["public"]["Tables"];

export interface CityRow {
  id: string;
  slug: string;
  name: string;
  state: string;
  timezone: string;
  intro_md: string | null;
  hero_image_url: string | null;
  lat: number | null;
  lng: number | null;
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  group: Database["public"]["Enums"]["category_group"];
  icon: string | null;
}

export interface AreaRow {
  id: string;
  slug: string;
  name: string;
}

export interface VendorCardRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  price_band: PriceBand | null;
  verified: boolean;
  cover_image_url: string | null;
  features: string[];
  opening_hours: Tables["vendors"]["Row"]["opening_hours"];
  last_activity_at: string | null;
  lat: number | null;
  lng: number | null;
  category: { slug: string; name: string; icon: string | null } | null;
  area: { slug: string; name: string } | null;
}

export interface VendorDetailRow extends VendorCardRow {
  description_md: string | null;
  address_line: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website_url: string | null;
  booking_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  x_handle: string | null;
  logo_url: string | null;
  gallery: Tables["vendors"]["Row"]["gallery"];
  dress_code: string | null;
  age_policy: string | null;
  parking_note: string | null;
  late_night_area_note: string | null;
  claim_status: Database["public"]["Enums"]["claim_status"];
  is_seed: boolean;
  last_official_update_at: string | null;
  updated_at: string;
  city: { slug: string; name: string; timezone: string } | null;
}

const VENDOR_CARD_SELECT =
  "id, slug, name, tagline, price_band, verified, cover_image_url, features, opening_hours, last_activity_at, lat, lng, category:categories(slug, name, icon), area:areas(slug, name)";

export const listCities = cache(async (): Promise<CityRow[]> => {
  const { data, error } = await getPublicSupabase()
    .from("cities")
    .select("id, slug, name, state, timezone, intro_md, hero_image_url, lat, lng")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as CityRow[];
});

export const getCityBySlug = cache(async (slug: string): Promise<CityRow | null> => {
  const cities = await listCities();
  return cities.find((c) => c.slug === slug) ?? null;
});

export const listCategories = cache(async (): Promise<CategoryRow[]> => {
  const { data, error } = await getPublicSupabase()
    .from("categories")
    .select("id, slug, name, group, icon")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export const listAreas = cache(async (cityId: string): Promise<AreaRow[]> => {
  const { data, error } = await getPublicSupabase()
    .from("areas")
    .select("id, slug, name")
    .eq("city_id", cityId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export interface VendorFilters {
  categoryId?: string;
  areaId?: string;
  priceBand?: PriceBand;
  feature?: string;
  limit?: number;
}

export async function listVendorsForCity(cityId: string, filters: VendorFilters = {}): Promise<VendorCardRow[]> {
  let query = getPublicSupabase()
    .from("vendors")
    .select(VENDOR_CARD_SELECT)
    .eq("city_id", cityId)
    .eq("status", "published")
    .is("deleted_at", null);
  if (filters.categoryId) query = query.or(`category_id.eq.${filters.categoryId},secondary_category_ids.cs.{${filters.categoryId}}`);
  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.priceBand) query = query.eq("price_band", filters.priceBand);
  if (filters.feature) query = query.contains("features", [filters.feature]);
  const { data, error } = await query
    .order("verified", { ascending: false })
    .order("last_activity_at", { ascending: false, nullsFirst: false })
    .order("name")
    .limit(filters.limit ?? 120);
  if (error) throw error;
  return (data ?? []) as unknown as VendorCardRow[];
}

export const getVendorBySlug = cache(async (slug: string): Promise<VendorDetailRow | null> => {
  const { data, error } = await getPublicSupabase()
    .from("vendors")
    .select(
      `${VENDOR_CARD_SELECT}, description_md, address_line, phone, whatsapp, email, website_url, booking_url, instagram_handle, tiktok_handle, x_handle, logo_url, gallery, dress_code, age_policy, parking_note, late_night_area_note, claim_status, is_seed, last_official_update_at, updated_at, city:cities(slug, name, timezone)`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as VendorDetailRow | null;
});

export interface PriceRow {
  id: string;
  label: string;
  amount_ngn: number;
  note: string | null;
}

export async function listVendorPrices(vendorId: string): Promise<PriceRow[]> {
  const now = new Date().toISOString();
  const { data, error } = await getPublicSupabase()
    .from("vendor_prices")
    .select("id, label, amount_ngn, note")
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .lte("valid_from", now)
    .or(`valid_to.is.null,valid_to.gt.${now}`)
    .order("amount_ngn");
  if (error) throw error;
  return data ?? [];
}

export interface UpcomingEventRow {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  category: Database["public"]["Enums"]["event_category"];
  is_free: boolean;
  price_from_ngn: number | null;
}

export async function listUpcomingEventsForVendor(vendorId: string, limit = 5): Promise<UpcomingEventRow[]> {
  const { data, error } = await getPublicSupabase()
    .from("events")
    .select("id, slug, title, starts_at, ends_at, category, is_free, price_from_ngn")
    .eq("status", "published")
    .or(`vendor_id.eq.${vendorId},venue_vendor_id.eq.${vendorId}`)
    .gte("starts_at", new Date(Date.now() - 6 * 3600_000).toISOString())
    .order("starts_at")
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface SearchHit {
  kind: "vendor" | "event" | "guide";
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  city_id: string | null;
  score: number;
}

export async function searchDirectory(q: string, cityId?: string, limit = 20): Promise<SearchHit[]> {
  if (q.trim().length < 2) return [];
  const { data, error } = await getPublicSupabase().rpc("search_directory", {
    p_q: q.slice(0, 100),
    p_city_id: cityId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as SearchHit[];
}

/** For the sitemap. */
export async function listPublishedVendorSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  const { data, error } = await getPublicSupabase()
    .from("vendors")
    .select("slug, updated_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(10000);
  if (error) throw error;
  return data ?? [];
}

export interface AreaWithCity extends AreaRow {
  city_id: string;
  lat: number | null;
  lng: number | null;
}

export const listAllAreas = cache(async (): Promise<AreaWithCity[]> => {
  const { data, error } = await getPublicSupabase()
    .from("areas")
    .select("id, slug, name, city_id, lat, lng")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as AreaWithCity[];
});

export interface OfficialUpdateRow {
  id: string;
  crowd_level: number | null;
  body: string | null;
  created_at: string;
  media: Array<{ storage_path: string; width: number | null; height: number | null; blurhash: string | null }>;
}

/** Official updates from the last 24 h (pinned on the vendor page, §8.2). */
export async function listRecentOfficialUpdates(vendorId: string, limit = 3): Promise<OfficialUpdateRow[]> {
  const { data, error } = await getPublicSupabase()
    .from("posts")
    .select("id, crowd_level, body, created_at, media:post_media(storage_path, width, height, blurhash)")
    .eq("vendor_id", vendorId)
    .eq("kind", "official")
    .eq("status", "published")
    .is("deleted_at", null)
    .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as OfficialUpdateRow[];
}
