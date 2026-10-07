/**
 * Bootstrap the super admin from SUPER_ADMIN_EMAIL (PRD §13). Idempotent.
 * Run: npm run create-super-admin
 *
 * - Creates the auth user if missing (email pre-confirmed, NO password — sign in with a magic link
 *   or "forgot password"), otherwise reuses the existing user.
 * - Sets profiles.role = 'super_admin' and writes an audit entry.
 * - MFA (TOTP) must then be enrolled at /admin/mfa before any admin page will open (aal2).
 */
import { writeAudit } from "../lib/admin-db/audit";
import { getAdminSupabase } from "../lib/admin-db/client";

async function findUserIdByEmail(email: string): Promise<string | undefined> {
  const admin = getAdminSupabase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) return undefined;
  }
  return undefined;
}

async function main(): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("SUPER_ADMIN_EMAIL is not set.");

  const admin = getAdminSupabase();
  let userId = await findUserIdByEmail(email);
  if (userId) {
    console.log("Existing auth user found for SUPER_ADMIN_EMAIL.");
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    console.log("Created auth user for SUPER_ADMIN_EMAIL (email confirmed, no password).");
  }

  const { data: before, error: readError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single();
  if (readError) throw readError;

  if (before.role === "super_admin") {
    console.log("Profile already has role super_admin. Nothing to change.");
    return;
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role: "super_admin" })
    .eq("id", userId);
  if (updateError) throw updateError;

  await writeAudit({
    action: "profile.role_granted",
    entityType: "public.profiles",
    entityId: userId,
    before: { role: before.role },
    after: { role: "super_admin" },
    reason: "Bootstrap via scripts/create-super-admin.ts",
    actorRole: "system",
  });

  console.log("Granted super_admin. Next: sign in with a magic link, then enrol MFA at /admin/mfa.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
