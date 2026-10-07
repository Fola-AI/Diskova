import { nanoid } from "nanoid";
import slugify from "slugify";

import type { SessionContext } from "@/lib/auth/guards";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { getPlatformSettings, moderationSettings } from "@/lib/admin-db/settings";
import { adminRecipients, sendEmail } from "@/lib/email/send";
import { AdminEventSubmittedEmail } from "@/lib/email/templates/events";
import { effectiveScore, moderateText } from "@/lib/moderation/text";
import { rateLimit, retryAfterText } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";
import { eventSubmitSchema, localToUtcIso } from "@/lib/validation/events";

assertServerOnly("lib/services/events");

export class EventError extends Error {}

async function uniqueEventSlug(title: string, startIso: string): Promise<string> {
  const date = startIso.slice(0, 10);
  const base = slugify(`${title} ${date}`, { lower: true, strict: true }).slice(0, 80).replace(/-+$/, "") || "event";
  const admin = getAdminSupabase();
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : `${base}-${nanoid(4).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
    const { count } = await admin.from("events").select("id", { count: "exact", head: true }).eq("slug", candidate);
    if (!count) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * §8.6: verified users and vendor members submit events → `pending_review` (admin approves).
 * Text is moderated first: auto-block is refused, anything flagged goes into the moderation queue.
 */
export async function submitEvent(session: SessionContext, raw: unknown): Promise<{ id: string; slug: string }> {
  const input = eventSubmitSchema.parse(raw);
  const rl = await rateLimit("eventSubmitUser", session.user.id);
  if (!rl.ok) throw new EventError(`You've submitted several events today. Try again in ${retryAfterText(rl.reset)}.`);

  const settings = await getPlatformSettings();
  const mod = await moderateText(`${input.title}\n${input.description_md ?? ""}`, { blocklist: settings.blocklist_phrases });
  const score = effectiveScore([mod], Number(settings.moderation_auto_flag_threshold));
  if (score >= moderationSettings(settings).autoBlockThreshold) {
    throw new EventError("This event can't be submitted as written. Please review our Community Guidelines.");
  }

  // Venue: a listed (published) venue in the same city gives the event its location.
  let location: string | null = null;
  let venueName = input.venue_name_freeform;
  if (input.venue_vendor_id) {
    const { data: venue } = await session.supabase
      .from("vendors")
      .select("id, name, city_id, lat, lng")
      .eq("id", input.venue_vendor_id)
      .eq("status", "published")
      .maybeSingle();
    if (!venue || venue.city_id !== input.city_id) throw new EventError("Choose a venue in the selected city.");
    const v = venue as unknown as { name: string; lat: number; lng: number };
    location = `SRID=4326;POINT(${v.lng} ${v.lat})`;
    venueName = venueName ?? v.name;
  }

  const startsAt = localToUtcIso(input.starts_local);
  const slug = await uniqueEventSlug(input.title, startsAt);
  const { data, error } = await session.supabase
    .from("events")
    .insert({
      slug,
      title: input.title,
      description_md: input.description_md,
      vendor_id: input.vendor_id,
      venue_vendor_id: input.venue_vendor_id,
      venue_name_freeform: venueName,
      city_id: input.city_id,
      area_id: input.area_id,
      location,
      starts_at: startsAt,
      ends_at: input.ends_local ? localToUtcIso(input.ends_local) : null,
      category: input.category,
      ticket_url: input.ticket_url,
      is_free: input.is_free,
      price_from_ngn: input.is_free ? null : input.price_from_ngn,
      price_to_ngn: input.is_free ? null : input.price_to_ngn,
      status: "pending_review",
      submitted_by: session.user.id,
    })
    .select("id, slug")
    .single();
  if (error || !data) {
    throw new EventError(input.vendor_id ? "You can only submit events for venues you manage." : "We couldn't submit your event. Please try again.");
  }

  if (score >= moderationSettings(settings).autoFlagThreshold) {
    await getAdminSupabase().from("moderation_items").insert({ entity_type: "event", entity_id: data.id, priority: 2, source: "auto_flag" });
  }
  await sendEmail({ to: adminRecipients(), subject: `New event to review: ${input.title}`, react: AdminEventSubmittedEmail({ title: input.title }) });
  return data;
}
