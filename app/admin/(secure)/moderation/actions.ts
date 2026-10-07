"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import type { FormState } from "@/components/forms/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { decideModerationItem } from "@/lib/services/admin/moderation";
import { AdminActionError } from "@/lib/services/admin/vendors";

export async function moderationDecisionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("moderator", "/admin/moderation");
  try {
    await decideModerationItem(
      session,
      {
        itemId: formData.get("itemId"),
        action: formData.get("action"),
        reason: formData.get("reason") || undefined,
        category: formData.get("category") || undefined,
      },
      await requestMeta(),
    );
  } catch (err) {
    if (err instanceof AdminActionError) return { error: err.message };
    if (err instanceof ZodError) return { error: err.issues[0]?.message ?? "Invalid input." };
    console.error(err);
    return { error: "Action failed." };
  }
  revalidatePath("/admin/moderation");
  return { ok: true, message: "Done." };
}
