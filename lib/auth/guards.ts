import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { isStaffRole, memberRoleAtLeast, roleAtLeast, type UserRole, type VendorMemberRole } from "@/lib/auth/roles";
import { getServerSupabase } from "@/lib/db/server";
import type { Database } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/auth/guards");

export type MyProfile = Database["public"]["Functions"]["get_my_profile"]["Returns"][number];
type ServerSupabase = Awaited<ReturnType<typeof getServerSupabase>>;

export interface SessionContext {
  supabase: ServerSupabase;
  user: User;
  profile: MyProfile;
}

/**
 * Current user, verified against Supabase Auth (getUser hits the Auth server — never trust the
 * cookie payload alone). Cached per request.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: rows } = await supabase.rpc("get_my_profile");
  const profile = rows?.[0];
  if (!profile) return null; // deleted / anonymised account
  return { supabase, user: data.user, profile };
});

/** Signed in, or redirect to /login?next=… */
export async function requireUser(next?: string): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return session;
}

/** Signed in, email verified, and not suspended/banned — required to post, pulse, report, submit. */
export async function requireVerifiedUser(next?: string): Promise<SessionContext> {
  const session = await requireUser(next);
  const { profile } = session;
  if (!profile.email_verified_at) redirect("/verify");
  if (profile.status === "suspended" || profile.status === "banned") redirect("/me?restricted=1");
  return session;
}

/** Current Authenticator Assurance Level of the session ("aal1" | "aal2"). */
export async function currentAal(supabase: ServerSupabase): Promise<{ current: string | null; next: string | null }> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return { current: data?.currentLevel ?? null, next: data?.nextLevel ?? null };
}

/**
 * Role gate (§5). Any staff role (moderator/admin/super_admin) ALSO requires an aal2 (MFA) session;
 * without it the user is sent to /admin/mfa to enrol or verify. Non-matching roles get a 404 so admin
 * routes don't reveal themselves.
 */
export async function requireRole(min: UserRole, next = "/admin"): Promise<SessionContext> {
  const session = await requireUser(next);
  const role = session.profile.role as UserRole;
  if (!roleAtLeast(role, min) || session.profile.status === "suspended" || session.profile.status === "banned") {
    notFound();
  }
  if (isStaffRole(min)) {
    const aal = await currentAal(session.supabase);
    if (aal.current !== "aal2") redirect(`/admin/mfa?next=${encodeURIComponent(next)}`);
  }
  return session;
}

/** Accepted member of the vendor with at least `minRole` (owner > manager > staff). */
export async function requireVendorMember(
  vendorId: string,
  minRole: VendorMemberRole = "staff",
): Promise<SessionContext & { memberRole: VendorMemberRole }> {
  const session = await requireVerifiedUser(`/vendor`);
  const { data } = await session.supabase
    .from("vendor_members")
    .select("role, accepted_at")
    .eq("vendor_id", vendorId)
    .eq("profile_id", session.user.id)
    .maybeSingle();
  if (!data?.accepted_at || !memberRoleAtLeast(data.role, minRole)) notFound();
  return { ...session, memberRole: data.role };
}
