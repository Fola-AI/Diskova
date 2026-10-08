/** Stage L5: vendor membership roles, prices, verification/claim request isolation. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";

const d = hasDevEnv ? describe : describe.skip;

d("L5 · vendor members, prices and verification requests", () => {
  let owner: TestUser;
  let staffMember: TestUser;
  let outsider: TestUser;
  let vendorId: string;

  beforeAll(async () => {
    [owner, staffMember, outsider] = await Promise.all([createUser("v-owner"), createUser("v-staff"), createUser("v-outsider")]);
    vendorId = (await createPublishedVendor("l5")).id;
    const admin = serviceClient();
    const now = new Date().toISOString();
    await admin.from("vendor_members").insert([
      { vendor_id: vendorId, profile_id: owner.id, role: "owner", accepted_at: now },
      { vendor_id: vendorId, profile_id: staffMember.id, role: "staff", accepted_at: now },
    ]);
  });

  afterAll(cleanup);

  it("owners can edit the listing; staff members and outsiders cannot", async () => {
    const ok = await owner.client.from("vendors").update({ tagline: "Owner edit" }).eq("id", vendorId).select("id");
    expect(ok.data).toHaveLength(1);
    const staff = await staffMember.client.from("vendors").update({ tagline: "Staff edit" }).eq("id", vendorId).select("id");
    expect(staff.data ?? []).toHaveLength(0);
    const outsiderRes = await outsider.client.from("vendors").update({ tagline: "Nope" }).eq("id", vendorId).select("id");
    expect(outsiderRes.data ?? []).toHaveLength(0);
  });

  it("staff members can post official updates (and outsiders cannot)", async () => {
    const staff = await staffMember.client
      .from("posts")
      .insert({ author_id: staffMember.id, vendor_id: vendorId, kind: "official", crowd_level: 2 })
      .select("id")
      .single();
    expect(staff.error).toBeNull();
    const out = await outsider.client
      .from("posts")
      .insert({ author_id: outsider.id, vendor_id: vendorId, kind: "official", crowd_level: 2 });
    expect(out.error).not.toBeNull();
  });

  it("a vendor_posting_ban blocks official updates", async () => {
    await serviceClient().from("user_sanctions").insert({ profile_id: staffMember.id, kind: "vendor_posting_ban", reason: "RLS test ban" });
    const res = await staffMember.client
      .from("posts")
      .insert({ author_id: staffMember.id, vendor_id: vendorId, kind: "official", crowd_level: 3 });
    expect(res.error).not.toBeNull();
  });

  it("only managers+ can change prices", async () => {
    const ok = await owner.client.from("vendor_prices").insert({ vendor_id: vendorId, label: "Entry", amount_ngn: 5000 });
    expect(ok.error).toBeNull();
    const staff = await staffMember.client.from("vendor_prices").insert({ vendor_id: vendorId, label: "Sneaky", amount_ngn: 1 });
    expect(staff.error).not.toBeNull();
    const out = await outsider.client.from("vendor_prices").insert({ vendor_id: vendorId, label: "Sneaky", amount_ngn: 1 });
    expect(out.error).not.toBeNull();
  });

  it("verification RPCs are service-role only; users see only their own requests", async () => {
    for (const client of [anonClient(), outsider.client]) {
      const create = await client.rpc("admin_create_verification_request", { p_vendor_id: vendorId, p_submitted_by: outsider.id });
      expect(create.error).not.toBeNull();
      const list = await client.rpc("admin_list_verification_requests", { p_status: "pending" });
      expect(list.error).not.toBeNull();
    }
    const admin = serviceClient();
    const { data: reqId, error } = await admin.rpc("admin_create_verification_request", {
      p_vendor_id: vendorId,
      p_submitted_by: owner.id,
      p_social_proof_url: "https://example.com",
    });
    expect(error).toBeNull();
    const mine = await owner.client.rpc("my_verification_requests", { p_vendor_id: vendorId });
    expect(mine.data?.map((r) => r.id)).toContain(reqId);
    const theirs = await outsider.client.rpc("my_verification_requests", { p_vendor_id: vendorId });
    expect(theirs.data).toEqual([]);
    // Duplicate pending requests are refused.
    const dup = await admin.rpc("admin_create_verification_request", { p_vendor_id: vendorId, p_submitted_by: owner.id });
    expect(dup.error?.message).toMatch(/already pending/);
  });

  it("verification documents bucket is not readable by users", async () => {
    const list = await owner.client.storage.from("verification-docs").list(vendorId);
    expect(list.data ?? []).toEqual([]);
    const up = await owner.client.storage.from("verification-docs").upload(`${vendorId}/${owner.id}/x.pdf`, new Blob(["x"]), { contentType: "application/pdf" });
    expect(up.error).not.toBeNull();
  });
});
