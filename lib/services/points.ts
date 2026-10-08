import { toZonedTime } from "date-fns-tz";

import { getAdminSupabase } from "@/lib/admin-db/client";
import { DEFAULT_TIMEZONE, FEATURES } from "@/lib/config";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/points");

/** §1.6 / §8.3 point rules. No cash value. */
export const POINTS = {
  pulse: 1,
  pulseAtVenue: 1,
  checkin: 3,
  checkinWithPhoto: 2,
  checkinAtVenue: 2,
  firstAtVendor: 5,
  officialUpdate: 5, // vendor points (decision: PRD doesn't specify an amount)
} as const;
export const DAILY_CAP = 60; // per user per Lagos day (§6.20)
export const BADGES = { explorer: "Explorer", nightOwl: "Night Owl", firstIn: "First-in" } as const;

type PointKind = "checkin" | "checkin_at_venue" | "checkin_with_photo" | "pulse" | "official_update" | "first_at_vendor";

export interface AwardablePost {
  id: string;
  author_id: string;
  vendor_id: string;
  kind: "checkin" | "pulse" | "update" | "official";
  is_at_venue: boolean;
  created_at: string;
}

function startOfLagosDayIso(now = new Date()): string {
  const local = toZonedTime(now, DEFAULT_TIMEZONE);
  // Lagos is UTC+1 all year: local midnight = 23:00 UTC the previous day.
  const utcMidnight = Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()) - 3600_000;
  return new Date(utcMidnight).toISOString();
}

/** Apply the daily cap to a list of awards (in order). Pure — unit-tested. */
export function capAwards<T extends { points: number }>(awards: T[], alreadyToday: number, cap = DAILY_CAP): T[] {
  let remaining = Math.max(0, cap - alreadyToday);
  const out: T[] = [];
  for (const a of awards) {
    if (remaining <= 0) break;
    const points = Math.min(a.points, remaining);
    out.push({ ...a, points });
    remaining -= points;
  }
  return out;
}

/**
 * Award points for a newly PUBLISHED post. Idempotent per post; held posts earn points when a
 * moderator approves them (Stage L8). Returns the points actually granted to the author.
 */
export async function awardForPost(post: AwardablePost, opts: { hasPhoto: boolean }): Promise<number> {
  if (!FEATURES.points) return 0;
  const admin = getAdminSupabase();
  const { count: already } = await admin
    .from("point_events")
    .select("id", { count: "exact", head: true })
    .eq("ref_entity_type", "post")
    .eq("ref_entity_id", post.id);
  if (already) return 0;

  if (post.kind === "official" || post.kind === "update") {
    // Vendor points, at most once an hour per venue.
    const { count: recent } = await admin
      .from("point_events")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", post.vendor_id)
      .eq("kind", "official_update")
      .gte("at", new Date(Date.now() - 3600_000).toISOString());
    if (!recent) {
      await admin.from("point_events").insert({
        vendor_id: post.vendor_id,
        kind: "official_update",
        points: POINTS.officialUpdate,
        ref_entity_type: "post",
        ref_entity_id: post.id,
      });
    }
    return 0;
  }

  const awards: Array<{ kind: PointKind; points: number }> = [];
  if (post.kind === "pulse") {
    awards.push({ kind: "pulse", points: POINTS.pulse });
    if (post.is_at_venue) awards.push({ kind: "checkin_at_venue", points: POINTS.pulseAtVenue });
  } else {
    awards.push({ kind: "checkin", points: POINTS.checkin });
    if (opts.hasPhoto) awards.push({ kind: "checkin_with_photo", points: POINTS.checkinWithPhoto });
    if (post.is_at_venue) awards.push({ kind: "checkin_at_venue", points: POINTS.checkinAtVenue });
    const { count: earlier } = await admin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", post.vendor_id)
      .eq("kind", "checkin")
      .eq("status", "published")
      .neq("id", post.id)
      .gte("created_at", startOfLagosDayIso())
      .lt("created_at", post.created_at);
    if (!earlier) awards.push({ kind: "first_at_vendor", points: POINTS.firstAtVendor });
  }

  const { data: today } = await admin.rpc("admin_points_today", { p_profile_id: post.author_id });
  const capped = capAwards(awards, today ?? 0);
  if (capped.length) {
    const { error } = await admin.from("point_events").insert(
      capped.map((a) => ({
        profile_id: post.author_id,
        vendor_id: post.vendor_id,
        kind: a.kind,
        points: a.points,
        ref_entity_type: "post",
        ref_entity_id: post.id,
      })),
    );
    if (error) throw error;
  }
  await refreshBadges(post.author_id);
  return capped.reduce((sum, a) => sum + a.points, 0);
}

/** Explorer: 5 different venues · Night Owl: 5 posts between midnight and 4am · First-in: ever first at a venue. */
export async function refreshBadges(profileId: string): Promise<string[]> {
  const admin = getAdminSupabase();
  const [{ data: posts }, { count: firsts }, { data: profile }] = await Promise.all([
    admin
      .from("posts")
      .select("vendor_id, created_at")
      .eq("author_id", profileId)
      .eq("status", "published")
      .in("kind", ["checkin", "pulse"])
      .limit(1000),
    admin.from("point_events").select("id", { count: "exact", head: true }).eq("profile_id", profileId).eq("kind", "first_at_vendor"),
    admin.from("profiles").select("badges").eq("id", profileId).single(),
  ]);
  const earned = new Set(profile?.badges ?? []);
  const vendors = new Set((posts ?? []).map((p) => p.vendor_id));
  const lateNight = (posts ?? []).filter((p) => toZonedTime(new Date(p.created_at), DEFAULT_TIMEZONE).getHours() < 4).length;
  if (vendors.size >= 5) earned.add(BADGES.explorer);
  if (lateNight >= 5) earned.add(BADGES.nightOwl);
  if ((firsts ?? 0) > 0) earned.add(BADGES.firstIn);
  const next = [...earned];
  if (next.length !== (profile?.badges ?? []).length) {
    await admin.from("profiles").update({ badges: next }).eq("id", profileId);
  }
  return next;
}
