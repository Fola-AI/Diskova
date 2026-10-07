import { getPublicSupabase } from "@/lib/db/public";
import type { Database } from "@/lib/db/types";

export type EventCategoryEnum = Database["public"]["Enums"]["event_category"];

export interface EventCardRow {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  category: EventCategoryEnum;
  status: string;
  is_free: boolean;
  is_featured: boolean;
  is_december_season: boolean;
  price_from_ngn: number | null;
  price_to_ngn: number | null;
  cover_image_url: string | null;
  venue_name_freeform: string | null;
  city: { slug: string; name: string } | null;
  venue: { slug: string; name: string } | null;
}

const CARD_SELECT =
  "id, slug, title, starts_at, ends_at, timezone, category, status, is_free, is_featured, is_december_season, price_from_ngn, price_to_ngn, cover_image_url, venue_name_freeform, city:cities(slug, name), venue:vendors!events_venue_vendor_id_fkey(slug, name)";

export interface EventQuery {
  cityId?: string;
  from: Date;
  to?: Date;
  seasonOnly?: boolean;
  category?: EventCategoryEnum;
  limit?: number;
}

/** Published (and cancelled, shown as such) events that haven't finished yet, soonest first. */
export async function listEvents(q: EventQuery): Promise<EventCardRow[]> {
  let query = getPublicSupabase()
    .from("events")
    .select(CARD_SELECT)
    .in("status", ["published", "cancelled"])
    .is("deleted_at", null)
    .gte("starts_at", q.from.toISOString());
  if (q.to) query = query.lt("starts_at", q.to.toISOString());
  if (q.cityId) query = query.eq("city_id", q.cityId);
  if (q.seasonOnly) query = query.eq("is_december_season", true);
  if (q.category) query = query.eq("category", q.category);
  const { data, error } = await query.order("is_featured", { ascending: false }).order("starts_at").limit(q.limit ?? 300);
  if (error) throw error;
  return (data ?? []) as unknown as EventCardRow[];
}

export interface EventDetail extends EventCardRow {
  description_md: string | null;
  ticket_url: string | null;
  updated_at: string;
  lat: number | null;
  lng: number | null;
  area: { name: string } | null;
  venue_full: { id: string; slug: string; name: string; tagline: string | null; cover_image_url: string | null; address_line: string | null } | null;
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const { data, error } = await getPublicSupabase()
    .from("events")
    .select(`${CARD_SELECT}, description_md, ticket_url, updated_at, lat, lng, area:areas(name), venue_full:vendors!events_venue_vendor_id_fkey(id, slug, name, tagline, cover_image_url, address_line)`)
    .eq("slug", slug)
    .in("status", ["published", "cancelled"])
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as EventDetail | null;
}

export async function listPublishedEventSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
  const { data } = await getPublicSupabase()
    .from("events")
    .select("slug, updated_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .gte("starts_at", new Date(Date.now() - 86_400_000).toISOString())
    .limit(5000);
  return data ?? [];
}
