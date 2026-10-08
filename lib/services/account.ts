import { getAdminSupabase } from "@/lib/admin-db/client";
import { writeAudit } from "@/lib/admin-db/audit";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/account");

/**
 * Delete + anonymise an account (§7.12): profile PII cleared and posts hidden now, auth user soft-deleted
 * (can't sign in), media removed by the daily purge within 24 h. Used by self-service and by admins.
 */
export async function anonymiseAccount(
  userId: string,
  audit: { actorId: string | null; actorRole: string; reason: string; ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const admin = getAdminSupabase();
  const { data: before } = await admin.from("profiles").select("username").eq("id", userId).single();
  const anonymised = `deleted_${userId.replace(/-/g, "").slice(0, 12)}`;
  const now = new Date().toISOString();
  const { error } = await admin
    .from("profiles")
    .update({ deleted_at: now, username: anonymised, display_name: null, bio: null, avatar_url: null, home_city_id: null, is_diaspora: null, location_consent: false, badges: [] })
    .eq("id", userId);
  if (error) throw new Error("Couldn't anonymise the profile.");
  await admin.from("posts").update({ deleted_at: now }).eq("author_id", userId).is("deleted_at", null);
  await writeAudit({
    action: "account.deleted",
    entityType: "public.profiles",
    entityId: userId,
    before: { username: before?.username ?? null },
    after: { username: anonymised },
    reason: audit.reason,
    actorId: audit.actorId,
    actorRole: audit.actorRole,
    ip: audit.ip,
    userAgent: audit.userAgent,
  });
  await admin.rpc("admin_force_logout", { p_profile_id: userId });
  await admin.auth.admin.deleteUser(userId, true);
}
