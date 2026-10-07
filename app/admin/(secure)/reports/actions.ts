"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { resolveReport } from "@/lib/services/admin/reports";

export async function resolveReportForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("moderator", "/admin/reports");
  try {
    await resolveReport(session, { id: formData.get("id"), status: formData.get("action"), note: formData.get("reason") || undefined }, await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/reports");
  return { ok: true, message: "Updated." };
}
