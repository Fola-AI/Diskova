"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { pointsAction } from "@/lib/services/admin/points";

export async function pointsForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/points");
  try {
    await pointsAction(session, { username: formData.get("username"), action: formData.get("action"), points: formData.get("points") || undefined, badge: formData.get("badge") || undefined, reason: formData.get("reason") ?? "" }, await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/points");
  return { ok: true, message: "Saved." };
}
