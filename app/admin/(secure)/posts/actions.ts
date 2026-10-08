"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { bulkPostAction } from "@/lib/services/admin/posts";

export async function bulkPostForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("moderator", "/admin/posts");
  const ids = formData.getAll("ids").map(String);
  if (!ids.length) return { error: "Select at least one post." };
  try {
    const n = await bulkPostAction(session, { ids, action: formData.get("action"), reason: formData.get("reason") ?? "" }, await requestMeta());
    revalidatePath("/admin/posts");
    return { ok: true, message: `${n} post(s) updated.` };
  } catch (err) {
    return toFormState(err);
  }
}
