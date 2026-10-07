import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { Constants } from "@/lib/db/types";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/safety");

const schema = z.object({
  id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || undefined),
  city_id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
  section: z.enum(Constants.public.Enums.safety_section),
  title: z.string().trim().min(2).max(140),
  body_md: z.string().trim().max(10000),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  mark_verified: z.union([z.literal("on"), z.literal("")]).optional().transform((v) => v === "on"),
  action: z.enum(["save", "delete"]).default("save"),
  reason: z.string().trim().max(500).optional(),
});

export async function listSafetyAdmin() {
  const admin = getAdminSupabase();
  const [{ data: items }, { data: cities }] = await Promise.all([
    admin.from("safety_info").select("id, city_id, section, title, body_md, sort_order, last_verified_at, verifier:profiles!safety_info_verified_by_fkey(username)").order("section").order("sort_order"),
    admin.from("cities").select("id, name").order("sort_order"),
  ]);
  return { items: items ?? [], cities: cities ?? [] };
}

/**
 * §11.7 safety_info editor. "Mark verified" stamps last_verified_at — the public page shows that
 * date so travellers can judge freshness. Deleting requires a reason.
 */
export async function saveSafety(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<void> {
  const { id, mark_verified, action, reason, ...row } = schema.parse(raw);
  const admin = getAdminSupabase();
  if (action === "delete") {
    if (!id) throw new AdminActionError("Nothing to delete.");
    if (!reason || reason.length < 5) throw new AdminActionError("Give a reason (at least 5 characters).");
    const { data: before } = await admin.from("safety_info").select("*").eq("id", id).single();
    const { error } = await admin.from("safety_info").delete().eq("id", id);
    if (error) throw new AdminActionError("Couldn't delete.");
    await writeAudit({ action: "safety_info.deleted", entityType: "public.safety_info", entityId: id, before: before ?? null, reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  } else {
    const patch = { ...row, ...(mark_verified ? { last_verified_at: new Date().toISOString(), verified_by: session.user.id } : {}) };
    const { data, error } = id
      ? await admin.from("safety_info").update(patch).eq("id", id).select("id").single()
      : await admin.from("safety_info").insert(patch).select("id").single();
    if (error || !data) throw new AdminActionError("Couldn't save.");
    await writeAudit({ action: id ? (mark_verified ? "safety_info.verified" : "safety_info.updated") : "safety_info.created", entityType: "public.safety_info", entityId: data.id, after: patch, reason: reason || null, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  }
  safeRevalidatePath("/safety", "layout");
}
