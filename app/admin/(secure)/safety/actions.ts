"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { saveSafety } from "@/lib/services/admin/safety";

export async function saveSafetyForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/safety");
  try {
    await saveSafety(session, Object.fromEntries(formData), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/safety");
  return { ok: true, message: formData.get("action") === "delete" ? "Deleted." : "Saved." };
}
