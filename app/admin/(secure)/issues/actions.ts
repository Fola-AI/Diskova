"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/components/forms/form-state";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";

const schema = z.object({ id: z.uuid(), status: z.enum(["new", "triaged", "escalated", "closed"]), note: z.string().trim().max(2000).optional() });

export async function updateIssueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/issues");
  const parsed = schema.safeParse({ id: formData.get("id"), status: formData.get("status"), note: formData.get("note") || undefined });
  if (!parsed.success) return { error: "Invalid input." };
  const { error } = await getAdminSupabase().rpc("admin_update_issue_report", {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
    p_handled_by: session.user.id,
    p_internal_note: parsed.data.note,
  });
  if (error) return { error: "Couldn't update." };
  await writeAudit({ action: "issue_report.updated", entityType: "private.issue_reports", entityId: parsed.data.id, after: { status: parsed.data.status }, actorId: session.user.id, actorRole: session.profile.role, ...(await requestMeta()) });
  revalidatePath("/admin/issues");
  return { ok: true, message: "Updated." };
}
