"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { createPinnedSeed, qaAdminAction } from "@/lib/services/admin/qa";

export async function qaActionForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("moderator", "/admin/qa");
  try {
    await qaAdminAction(session, { kind: formData.get("kind"), id: formData.get("id"), action: formData.get("action"), reason: formData.get("reason") || undefined }, await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/qa");
  return { ok: true, message: "Done." };
}

export async function createSeedForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/qa");
  try {
    await createPinnedSeed(session, Object.fromEntries(formData), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/qa");
  return { ok: true, message: "Pinned question created." };
}
