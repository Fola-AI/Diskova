"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requireRecentMfa } from "@/lib/auth/recent-mfa";
import { USER_ROLES } from "@/lib/auth/roles";
import { requestMeta } from "@/lib/http/request-meta";
import { changeRole, userAction } from "@/lib/services/admin/users";

export async function userActionForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("moderator", "/admin/users");
  const userId = String(formData.get("userId") ?? "");
  try {
    await userAction(session, { userId, action: formData.get("action"), reason: formData.get("reason") ?? "", days: formData.get("days") || undefined, sanctionId: formData.get("sanctionId") || undefined }, await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true, message: "Done." };
}

/** Role change: super_admin only, behind a fresh MFA challenge (≤ 5 minutes old). */
export async function changeRoleForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = String(formData.get("userId") ?? "");
  const session = await requireRole("super_admin", `/admin/users/${userId}`);
  await requireRecentMfa(session, `/admin/users/${userId}`);
  const role = USER_ROLES.find((r) => r === formData.get("role"));
  if (!role) return { error: "Choose a role." };
  try {
    await changeRole(session, userId, role, String(formData.get("reason") ?? ""), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: `Role changed to ${role}. Their sessions were signed out.` };
}
