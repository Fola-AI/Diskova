import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { roleAtLeast, type UserRole } from "@/lib/auth/roles";
import { assertServerOnly } from "@/lib/server-only";
import { anonymiseAccount } from "@/lib/services/account";
import { PAGE_SIZE, reasonSchema } from "@/lib/services/admin/common";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/users");

export interface UserFilters {
  q?: string;
  role?: UserRole;
  status?: "active" | "warned" | "suspended" | "banned";
  shadowbanned?: boolean;
  sort?: string;
  desc?: boolean;
  offset?: number;
  limit?: number;
}

/** §11.4: email visible to admin+, IP info to super_admin only (informational). */
export async function listUsers(viewer: SessionContext, f: UserFilters) {
  const { data, error } = await getAdminSupabase().rpc("admin_list_users", {
    p_q: f.q || undefined,
    p_role: f.role,
    p_status: f.status,
    p_shadowbanned: f.shadowbanned,
    p_include_email: roleAtLeast(viewer.profile.role, "admin"),
    p_include_ip: viewer.profile.role === "super_admin",
    p_sort: f.sort ?? "created_at",
    p_desc: f.desc ?? true,
    p_limit: f.limit ?? PAGE_SIZE,
    p_offset: f.offset ?? 0,
  });
  if (error) throw error;
  return { rows: data ?? [], total: Number(data?.[0]?.total ?? 0) };
}

export async function getUserDetail(viewer: SessionContext, id: string) {
  const admin = getAdminSupabase();
  const [{ data: profile }, { data: sanctions }, { data: posts }, network, { data: timeline }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, role, status, trust_score, points, badges, post_count, is_shadowbanned, created_at, last_seen_at, deleted_at").eq("id", id).maybeSingle(),
    admin.from("user_sanctions").select("id, kind, reason, issued_at, expires_at, lifted_at, issuer:profiles!user_sanctions_issued_by_fkey(username)").eq("profile_id", id).order("issued_at", { ascending: false }),
    admin.from("posts").select("id, kind, status, crowd_level, body, created_at, vendor:vendors(slug, name)").eq("author_id", id).order("created_at", { ascending: false }).limit(20),
    viewer.profile.role === "super_admin" ? admin.rpc("admin_user_network", { p_profile_id: id }) : Promise.resolve({ data: null }),
    admin.rpc("admin_list_audit", { p_entity_id: id, p_limit: 50 }),
  ]);
  if (!profile) return null;
  const email = roleAtLeast(viewer.profile.role, "admin") ? (await admin.auth.admin.getUserById(id)).data.user?.email ?? null : null;
  return { profile, email, sanctions: sanctions ?? [], posts: posts ?? [], network: network.data?.[0] ?? null, timeline: timeline ?? [] };
}

export const USER_ACTIONS = ["warn", "suspend", "ban", "shadowban", "lift", "reset_trust", "force_logout", "delete"] as const;
export type UserAction = (typeof USER_ACTIONS)[number];

const actionSchema = z.object({
  userId: z.uuid(),
  action: z.enum(USER_ACTIONS),
  reason: z.string().optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
  sanctionId: z.uuid().optional(),
});

/** Moderators: warn / suspend / shadowban / lift. Admins: + ban, reset trust, force logout, delete. */
export async function userAction(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<void> {
  const input = actionSchema.parse(raw);
  const reason = reasonSchema.parse(input.reason ?? "");
  const admin = getAdminSupabase();
  const adminOnly: UserAction[] = ["ban", "reset_trust", "force_logout", "delete"];
  if (adminOnly.includes(input.action) && !roleAtLeast(session.profile.role, "admin")) throw new AdminActionError("Only admins can do that.");
  if (input.userId === session.user.id) throw new AdminActionError("You can't apply this to your own account.");
  const { data: target } = await admin.from("profiles").select("role, trust_score, status").eq("id", input.userId).single();
  if (!target) throw new AdminActionError("User not found.");
  if (roleAtLeast(target.role, "moderator") && session.profile.role !== "super_admin") throw new AdminActionError("Only a super admin can act on staff accounts.");

  const expires = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
  switch (input.action) {
    case "warn":
      await admin.from("user_sanctions").insert({ profile_id: input.userId, kind: "warning", reason, issued_by: session.user.id, expires_at: expires(input.days ?? 30) });
      break;
    case "suspend":
      await admin.from("user_sanctions").insert({ profile_id: input.userId, kind: "suspension", reason, issued_by: session.user.id, expires_at: expires(input.days ?? 7) });
      break;
    case "ban":
      await admin.from("user_sanctions").insert({ profile_id: input.userId, kind: "ban", reason, issued_by: session.user.id });
      await admin.rpc("admin_force_logout", { p_profile_id: input.userId });
      break;
    case "shadowban":
      await admin.from("user_sanctions").insert({ profile_id: input.userId, kind: "shadowban", reason, issued_by: session.user.id });
      break;
    case "lift": {
      let q = admin.from("user_sanctions").update({ lifted_at: new Date().toISOString(), lifted_by: session.user.id }).eq("profile_id", input.userId).is("lifted_at", null);
      if (input.sanctionId) q = q.eq("id", input.sanctionId);
      await q;
      break;
    }
    case "reset_trust":
      await admin.from("profiles").update({ trust_score: 50 }).eq("id", input.userId);
      break;
    case "force_logout":
      await admin.rpc("admin_force_logout", { p_profile_id: input.userId });
      break;
    case "delete":
      await anonymiseAccount(input.userId, { actorId: session.user.id, actorRole: session.profile.role, reason, ...meta });
      return; // audited inside
  }
  await writeAudit({ action: `user.${input.action}`, entityType: "public.profiles", entityId: input.userId, before: { status: target.status, trust: target.trust_score }, after: { action: input.action, days: input.days ?? null }, reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}

/** Super admin only, behind an MFA re-prompt (enforced by the caller with requireRecentMfa). */
export async function changeRole(session: SessionContext, userId: string, role: UserRole, reasonRaw: string, meta: StaffMeta): Promise<void> {
  if (session.profile.role !== "super_admin") throw new AdminActionError("Only a super admin can change roles.");
  const reason = reasonSchema.parse(reasonRaw);
  if (userId === session.user.id) throw new AdminActionError("You can't change your own role.");
  const admin = getAdminSupabase();
  const { data: before } = await admin.from("profiles").select("role").eq("id", userId).single();
  if (!before) throw new AdminActionError("User not found.");
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new AdminActionError("Couldn't change the role.");
  await admin.rpc("admin_force_logout", { p_profile_id: userId }); // new privileges apply on next sign-in
  await writeAudit({ action: "user.role_changed", entityType: "public.profiles", entityId: userId, before: { role: before.role }, after: { role }, reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}
