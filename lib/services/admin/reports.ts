import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import type { Database } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";
import { PAGE_SIZE } from "@/lib/services/admin/common";
import type { StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/reports");

type Enums = Database["public"]["Enums"];

export async function listReportsAdmin(f: { status?: Enums["report_status"]; entity?: Enums["report_entity"]; reason?: Enums["report_reason"]; offset?: number }) {
  let q = getAdminSupabase()
    .from("reports")
    .select("id, entity_type, entity_id, reason, details, status, created_at, resolved_at, resolution_note, reporter:profiles!reports_reporter_id_fkey(username, trust_score)", { count: "exact" });
  if (f.status) q = q.eq("status", f.status);
  if (f.entity) q = q.eq("entity_type", f.entity);
  if (f.reason) q = q.eq("reason", f.reason);
  const { data, count, error } = await q.order("created_at", { ascending: false }).range(f.offset ?? 0, (f.offset ?? 0) + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

const resolveSchema = z.object({
  id: z.uuid(),
  status: z.enum(["reviewing", "resolved_kept", "resolved_removed", "dismissed"]),
  note: z.string().trim().max(1000).optional(),
});

/** §11.8. Dismissing / resolving a report needs a note (it's a moderation decision). */
export async function resolveReport(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<void> {
  const input = resolveSchema.parse(raw);
  if (input.status !== "reviewing" && (!input.note || input.note.length < 5)) throw new Error("Add a note (at least 5 characters).");
  const done = input.status !== "reviewing";
  const { error } = await getAdminSupabase()
    .from("reports")
    .update({ status: input.status, assigned_to: session.user.id, ...(done ? { resolved_by: session.user.id, resolved_at: new Date().toISOString(), resolution_note: input.note } : {}) })
    .eq("id", input.id);
  if (error) throw error;
  await writeAudit({ action: `report.${input.status}`, entityType: "public.reports", entityId: input.id, after: { status: input.status }, reason: input.note ?? null, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}
