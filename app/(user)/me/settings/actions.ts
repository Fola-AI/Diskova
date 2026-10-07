"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/components/forms/form-state";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { requireUser, requireVerifiedUser } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { createIncomingUpload, UploadError } from "@/lib/media/uploads";
import { rateLimit, retryAfterText } from "@/lib/ratelimit";
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

  const admin = getAdminSupabase();
  const anonymisedUsername = `deleted_${user.id.replace(/-/g, "").slice(0, 12)}`;
  const now = new Date().toISOString();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      deleted_at: now,
      username: anonymisedUsername,
      display_name: null,
      bio: null,
      avatar_url: null,
      home_city_id: null,
      is_diaspora: null,
      location_consent: false,
      badges: [],
    })
    .eq("id", user.id);
  if (profileError) return { error: "We couldn't delete your account. Please try again or contact us." };

  await admin.from("posts").update({ deleted_at: now }).eq("author_id", user.id).is("deleted_at", null);

  const { ip, userAgent } = await requestMeta();
  await writeAudit({
    action: "account.deleted",
    entityType: "public.profiles",
    entityId: user.id,
    before: { username: profile.username },
    after: { username: anonymisedUsername },
    reason: "Self-service account deletion",
    actorId: user.id,
    actorRole: profile.role,
    ip,
    userAgent,
  });

  // Soft delete: the auth row is anonymised and can no longer sign in; the profile row stays (anonymised).
  await admin.auth.admin.deleteUser(user.id, true);
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
