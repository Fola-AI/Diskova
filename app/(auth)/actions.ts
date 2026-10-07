"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/components/forms/form-state";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { safeNext } from "@/lib/auth/safe-next";
import { SITE_URL } from "@/lib/config";
import { getServerSupabase } from "@/lib/db/server";
import { requestMeta } from "@/lib/http/request-meta";
import { hashKey, rateLimitAll, retryAfterText } from "@/lib/ratelimit";
import {
  emailOnlySchema,
  fieldErrors,
  formObject,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

const GENERIC_LINK_SENT =
  "If an account exists for that address, we've sent a link. It can take a minute to arrive — check spam too.";

function tooMany(reset: number): FormState {
  return { error: `Too many attempts. Please try again in ${retryAfterText(reset)}.` };
}

function callbackUrl(next: string): string {
  return `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;
}

async function recordMeta(profileId: string, isSignup: boolean): Promise<void> {
  try {
    const { ip, userAgent } = await requestMeta();
    await getAdminSupabase().rpc("admin_record_profile_meta", {
      p_profile_id: profileId,
      p_ip: ip ?? undefined,
      p_user_agent: userAgent ?? undefined,
      p_is_signup: isSignup,
    });
  } catch {
    // Informational only — never block auth on it.
  }
}

export async function signInWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password, next } = parsed.data;

  const { ip } = await requestMeta();
  const rl = await rateLimitAll([
    ["loginEmail", hashKey(email)],
    ["loginIp", ip],
  ]);
  if (!rl.ok) return tooMany(rl.reset);

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. We can resend the link from the verify page." };
    }
    return { error: "That email and password don't match. Try again or reset your password." };
  }
  await recordMeta(data.user.id, false);
  redirect(safeNext(next));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, password } = parsed.data;

  const { ip } = await requestMeta();
  const rl = await rateLimitAll([
    ["signupIp", ip],
    ["emailLinkEmail", hashKey(email)],
  ]);
  if (!rl.ok) return tooMany(rl.reset);

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl("/me?welcome=1") },
  });
  if (error) {
    switch (error.code) {
      case "weak_password":
        return { fieldErrors: { password: [error.message] } };
      case "email_address_invalid":
        return { fieldErrors: { email: ["We can't send email to that address. Please check it or use another."] } };
      case "over_email_send_rate_limit":
        return { error: "We're sending a lot of emails right now. Please try again in an hour." };
      default:
        return { error: "We couldn't create your account just now. Please try again." };
    }
  }
  // A new signup has identities; an existing address returns an obfuscated user (no enumeration).
  if (data.user && (data.user.identities?.length ?? 0) > 0) {
    await recordMeta(data.user.id, true);
  }
  redirect("/verify?sent=1");
}

export async function sendMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email, next } = parsed.data;

  const { ip } = await requestMeta();
  const rl = await rateLimitAll([
    ["emailLinkEmail", hashKey(email)],
    ["emailLinkIp", ip],
  ]);
  if (!rl.ok) return tooMany(rl.reset);

  const supabase = await getServerSupabase();
  // shouldCreateUser: false — new accounts go through signup (terms consent).
  await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: callbackUrl(safeNext(next)) },
  });
  return { ok: true, message: GENERIC_LINK_SENT };
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email } = parsed.data;

  const { ip } = await requestMeta();
  const rl = await rateLimitAll([
    ["emailLinkEmail", hashKey(email)],
    ["emailLinkIp", ip],
  ]);
  if (!rl.ok) return tooMany(rl.reset);

  const supabase = await getServerSupabase();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/reset/update") });
  return { ok: true, message: GENERIC_LINK_SENT };
}

export async function resendVerification(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { email } = parsed.data;

  const { ip } = await requestMeta();
  const rl = await rateLimitAll([
    ["emailLinkEmail", hashKey(email)],
    ["emailLinkIp", ip],
  ]);
  if (!rl.ok) return tooMany(rl.reset);

  const supabase = await getServerSupabase();
  await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: callbackUrl("/me?welcome=1") } });
  return { ok: true, message: "If that address is waiting for confirmation, we've sent a new link." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Your reset link has expired. Please request a new one." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { fieldErrors: { password: ["Choose a different password."] } };
    if (error.code === "weak_password") return { fieldErrors: { password: [error.message] } };
    if (error.code === "reauthentication_needed") {
      return { error: "For your security, please request a fresh reset link and try again." };
    }
    return { error: "We couldn't update your password. Please try again." };
  }
  redirect("/me?password=updated");
}
