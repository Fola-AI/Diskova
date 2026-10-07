import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import type { Database } from "@/lib/db/types";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { sendEmail } from "@/lib/email/send";
import { EventDecisionEmail } from "@/lib/email/templates/events";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";
import { safeExternalUrl } from "@/lib/directory/links";
import { EVENT_CATEGORIES, localToUtcIso, type EventCategory } from "@/lib/validation/events";

assertServerOnly("lib/services/admin/events");

const reasonSchema = z.string().trim().min(5, "Give a reason (at least 5 characters).").max(1000);
export type EventAdminAction = "approve" | "reject" | "feature" | "unfeature" | "cancel";

export async function listEventsForReview() {
  const { data, error } = await getAdminSupabase()
    .from("events")
    .select("id, slug, title, starts_at, status, is_featured, is_december_season, category, venue_name_freeform, created_at, submitted_by, city:cities(name), submitter:profiles!events_submitted_by_fkey(username)")
    .in("status", ["pending_review"])
    .is("deleted_at", null)
    .order("starts_at");
  if (error) throw error;
  return data ?? [];
}

export async function listUpcomingPublishedForAdmin() {
  const { data } = await getAdminSupabase()
    .from("events")
    .select("id, slug, title, starts_at, status, is_featured, is_december_season, city:cities(name)")
    .eq("status", "published")
    .gte("starts_at", new Date(Date.now() - 86_400_000).toISOString())
    .order("starts_at")
    .limit(100);
  return data ?? [];
}

/** §11.6 (minimal L9 set): approve / reject (reason) / feature / cancel (reason). Every action audited. */
export async function decideEvent(session: SessionContext, eventId: string, action: EventAdminAction, reasonRaw: string | null, meta: StaffMeta): Promise<void> {
  const admin = getAdminSupabase();
  const { data: ev } = await admin.from("events").select("id, slug, title, status, is_featured, submitted_by").eq("id", eventId).single();
  if (!ev) throw new AdminActionError("Event not found.");
  const reason = action === "reject" || action === "cancel" ? reasonSchema.parse(reasonRaw ?? "") : reasonRaw?.trim() || null;

  let patch: Database["public"]["Tables"]["events"]["Update"];
  switch (action) {
    case "approve":
      if (ev.status !== "pending_review") throw new AdminActionError("Only pending events can be approved.");
      patch = { status: "published", approved_by: session.user.id, approved_at: new Date().toISOString() };
      break;
    case "reject":
      if (ev.status !== "pending_review") throw new AdminActionError("Only pending events can be rejected.");
      patch = { status: "rejected" };
      break;
    case "feature":
    case "unfeature":
      patch = { is_featured: action === "feature" };
      break;
    case "cancel":
      patch = { status: "cancelled" };
      break;
  }
  const { error } = await admin.from("events").update(patch).eq("id", eventId);
  if (error) throw new AdminActionError("Couldn't update the event.");
  await writeAudit({
    action: `event.${action}`,
    entityType: "public.events",
    entityId: eventId,
    before: { status: ev.status, is_featured: ev.is_featured },
    after: patch as never,
    reason,
    actorId: session.user.id,
    actorRole: session.profile.role,
    ...meta,
  });
  if ((action === "approve" || action === "reject") && ev.submitted_by) {
    const { data: u } = await admin.auth.admin.getUserById(ev.submitted_by);
    await sendEmail({
      to: u.user?.email,
      subject: action === "approve" ? `${ev.title} is listed` : `About your event: ${ev.title}`,
      react: EventDecisionEmail({ title: ev.title, slug: ev.slug, approved: action === "approve", reason }),
    });
  }
  safeRevalidatePath(`/events/${ev.slug}`);
  safeRevalidatePath("/events");
  safeRevalidatePath("/events/december");
  safeRevalidatePath("/sitemap.xml");
}

// ---------------------------------------------------------------------------------------------
// L12: edit + duplicates finder (§11.6)

const editSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    description_md: z.string().trim().max(20000).transform((v) => v || null),
    category: z.enum(EVENT_CATEGORIES.map((c) => c.value) as [EventCategory, ...EventCategory[]]),
    starts_local: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a date and time."),
    ends_local: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/), z.literal("")]).transform((v) => v || null),
    venue_name_freeform: z.string().trim().max(140).transform((v) => v || null),
    ticket_url: z.union([z.url().max(500), z.literal("")]).transform((v) => (v ? safeExternalUrl(v) : null)),
    is_free: z.union([z.literal("on"), z.literal(""), z.boolean()]).optional().transform((v) => v === "on" || v === true),
    price_from_ngn: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)]).transform((v) => (v === "" ? null : v)),
    price_to_ngn: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)]).transform((v) => (v === "" ? null : v)),
    reason: z.string().trim().min(5, "Give a reason (at least 5 characters).").max(1000),
  })
  .refine((v) => !v.ends_local || v.ends_local > v.starts_local, { path: ["ends_local"], message: "The end must be after the start." });

export async function getEventForEdit(id: string) {
  const { data } = await getAdminSupabase()
    .from("events")
    .select("id, slug, title, description_md, category, starts_at, ends_at, timezone, venue_name_freeform, ticket_url, is_free, price_from_ngn, price_to_ngn, status")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function adminEditEvent(session: SessionContext, eventId: string, raw: unknown, meta: StaffMeta): Promise<void> {
  const { reason, starts_local, ends_local, ...rest } = editSchema.parse(raw);
  const admin = getAdminSupabase();
  const before = await getEventForEdit(eventId);
  if (!before) throw new AdminActionError("Event not found.");
  const patch = {
    ...rest,
    starts_at: localToUtcIso(starts_local, before.timezone),
    ends_at: ends_local ? localToUtcIso(ends_local, before.timezone) : null,
  };
  const { error } = await admin.from("events").update(patch).eq("id", eventId);
  if (error) throw new AdminActionError("Couldn't save the event.");
  await writeAudit({ action: "event.edited_by_staff", entityType: "public.events", entityId: eventId, before, after: patch, reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath(`/events/${before.slug}`);
  safeRevalidatePath("/events");
  safeRevalidatePath("/events/december");
}

/** Likely duplicates: same day, same city, similar titles (pg_trgm). */
export async function listEventDuplicates() {
  const { data } = await getAdminSupabase().rpc("admin_event_duplicates", { p_limit: 50 });
  return data ?? [];
}
