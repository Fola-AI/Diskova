import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/settings");

const date = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).transform((v) => v || null);
const num = (min: number, max: number) => z.coerce.number().min(min).max(max);

export const settingsSchema = z
  .object({
    listing_is_free: z.union([z.literal("on"), z.literal(""), z.boolean()]).optional().transform((v) => v === "on" || v === true),
    monetisation_notice_md: z.string().trim().max(2000).transform((v) => v || null),
    checkin_expiry_hours: num(1, 72).int(),
    max_posts_per_user_per_hour: num(1, 100).int(),
    moderation_auto_block_threshold: num(0, 1),
    moderation_auto_flag_threshold: num(0, 1),
    media_hold_trust_below: num(0, 100).int(),
    media_hold_account_age_days: num(0, 365).int(),
    december_season_start: date,
    december_season_end: date,
    fx_gbp_per_ngn: z.union([z.literal(""), num(0, 1)]).transform((v) => (v === "" ? null : v)),
    fx_usd_per_ngn: z.union([z.literal(""), num(0, 1)]).transform((v) => (v === "" ? null : v)),
    maintenance_mode: z.union([z.literal("on"), z.literal(""), z.boolean()]).optional().transform((v) => v === "on" || v === true),
    blocklist_phrases: z.string().max(20000).transform((v) => [...new Set(v.split("\n").map((s) => s.trim()).filter(Boolean))].slice(0, 1000)),
    reason: z.string().trim().min(5, "Say why you're changing settings.").max(500),
  })
  .refine((v) => v.moderation_auto_flag_threshold <= v.moderation_auto_block_threshold, { path: ["moderation_auto_flag_threshold"], message: "Flag threshold must be ≤ block threshold." })
  .refine((v) => !v.december_season_start || !v.december_season_end || v.december_season_end > v.december_season_start, { path: ["december_season_end"], message: "End must be after start." });

/** §11.14 — super_admin only. Audited with a full before/after. */
export async function updateSettings(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<void> {
  if (session.profile.role !== "super_admin") throw new AdminActionError("Only a super admin can change settings.");
  const { reason, ...input } = settingsSchema.parse(raw);
  const admin = getAdminSupabase();
  const { data: before } = await admin.from("platform_settings").select("*").eq("id", 1).single();
  const { error } = await admin.from("platform_settings").update(input).eq("id", 1);
  if (error) throw new AdminActionError(`Couldn't save settings: ${error.message}`);
  await writeAudit({ action: "settings.updated", entityType: "public.platform_settings", entityId: "1", before: before as never, after: input as never, reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath("/");
  safeRevalidatePath("/events/december");
}

/** §11.3 "Add blocklist phrase" from the moderation queue — append-only for moderators, audited. */
export async function addBlocklistPhrase(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<void> {
  const phrase = z.string().trim().toLowerCase().min(3, "Phrase must be at least 3 characters.").max(100).parse(raw);
  const admin = getAdminSupabase();
  const { data } = await admin.from("platform_settings").select("blocklist_phrases").eq("id", 1).single();
  const current = data?.blocklist_phrases ?? [];
  if (current.includes(phrase)) return;
  if (current.length >= 1000) throw new AdminActionError("The blocklist is full — ask a super admin to tidy it.");
  const { error } = await admin.from("platform_settings").update({ blocklist_phrases: [...current, phrase] }).eq("id", 1);
  if (error) throw new AdminActionError("Couldn't update the blocklist.");
  await writeAudit({ action: "blocklist.phrase_added", entityType: "public.platform_settings", entityId: "1", after: { phrase }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}
