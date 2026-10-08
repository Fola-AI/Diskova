"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/forms/form-state";
import { requireUser, requireVerifiedUser } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { createIncomingUpload, UploadError } from "@/lib/media/uploads";
import { rateLimit, retryAfterText } from "@/lib/ratelimit";
import { anonymiseAccount } from "@/lib/services/account";
import { fieldErrors, formObject, profileSchema } from "@/lib/validation/auth";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser("/me/settings");
  const parsed = profileSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const rl = await rateLimit("profileUpdateUser", user.id);
  if (!rl.ok) return { error: `Too many changes. Try again in ${retryAfterText(rl.reset)}.` };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { username: ["That username is taken."] } };
    return { error: "We couldn't save your profile. Please try again." };
  }
  revalidatePath("/me");
  return { ok: true, message: "Profile saved." };
}

export async function createAvatarUpload(input: {
  mime: string;
  size: number;
}): Promise<{ path: string; token: string } | { error: string }> {
  const { user } = await requireVerifiedUser("/me/settings");
  try {
    return await createIncomingUpload(user.id, String(input.mime), Number(input.size));
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Couldn't start the upload." };
  }
}

/**
 * Delete account (§7.12): anonymise the profile and hide the user's posts immediately, soft-delete the
 * auth user (no further sign-in), sign out. Media files are removed by the daily purge within 24 h.
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, profile } = await requireUser("/me/settings");
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm.toLowerCase() !== profile.username.toLowerCase()) {
    return { fieldErrors: { confirm: [`Type your username (${profile.username}) to confirm.`] } };
  }

  const { ip, userAgent } = await requestMeta();
  await supabase.auth.signOut();
  await anonymiseAccount(user.id, { actorId: user.id, actorRole: profile.role, reason: "Self-service account deletion", ip, userAgent });
  redirect("/?account=deleted");
}
