/** Stage L11: private issue reports are invisible to every non-admin role (and to admins via the API too). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type Client } from "./helpers";

const d = hasDevEnv ? describe : describe.skip;

d("L11 · issue reports are private", () => {
  const clients: Record<string, Client> = {};
  const marker = `rls-issue-${Date.now().toString(36)}`;

  beforeAll(async () => {
    const [user, vendor, moderator, adminUser, superAdmin] = await Promise.all(
      ["l11-user", "l11-vendor", "l11-mod", "l11-admin", "l11-super"].map((l) => createUser(l)),
    );
    const svc = serviceClient();
    const v = await createPublishedVendor("l11");
    await svc.from("vendor_members").insert({ vendor_id: v.id, profile_id: vendor.id, role: "owner", accepted_at: new Date().toISOString() });
    await svc.from("profiles").update({ role: "moderator" }).eq("id", moderator.id);
    await svc.from("profiles").update({ role: "admin" }).eq("id", adminUser.id);
    await svc.from("profiles").update({ role: "super_admin" }).eq("id", superAdmin.id);
    Object.assign(clients, { anon: anonClient(), user: user.client, vendor_member: vendor.client, moderator: moderator.client, admin: adminUser.client, super_admin: superAdmin.client });
    const { error } = await svc.rpc("admin_create_issue_report", { p_category: "safety", p_description: `${marker} — test description`, p_reporter_email: "reporter@example.com" });
    if (error) throw error;
  });

  afterAll(cleanup);

  it("the report exists server-side", async () => {
    const { data } = await serviceClient().rpc("admin_list_issue_reports", {});
    expect(data?.some((r) => r.description.startsWith(marker))).toBe(true);
  });

  for (const role of ["anon", "user", "vendor_member", "moderator", "admin", "super_admin"]) {
    it(`${role}: no table access and no RPC access`, async () => {
      const c = clients[role];
      const table = await c.schema("private" as "public").from("issue_reports" as "posts").select("*").limit(1);
      expect(table.error?.code).toBe("PGRST106");
      const list = await c.rpc("admin_list_issue_reports", {});
      expect(list.error).not.toBeNull();
      expect(list.data ?? []).toEqual([]);
      const create = await c.rpc("admin_create_issue_report", { p_category: "other", p_description: "should not be allowed" });
      expect(create.error).not.toBeNull();
      const update = await c.rpc("admin_update_issue_report", { p_id: "00000000-0000-0000-0000-000000000000", p_status: "closed", p_handled_by: "00000000-0000-0000-0000-000000000000" });
      expect(update.error).not.toBeNull();
    });
  }
});
