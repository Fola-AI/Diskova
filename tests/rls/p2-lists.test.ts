/** Stage P2 · saved lists + public share pages. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addToList, countListView, createList, estimateCost, getSharedList, ListError, updateList, type SharedItem } from "@/lib/services/lists";

import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv ? describe : describe.skip;

describe("cost estimate (unit)", () => {
  it("sums cheapest–dearest listed prices; counts unpriced items; free events count as priced", () => {
    const v = (min: number | null, max: number | null): SharedItem => ({ id: "x", note: null, kind: "vendor", vendor: { id: "v", slug: "v", name: "V", tagline: null, price_band: null, cover_image_url: null, lat: null, lng: null, category: null, area: null, min_price: min, max_price: max } });
    const e = (from: number | null, to: number | null, free = false): SharedItem => ({ id: "y", note: null, kind: "event", event: { id: "e", slug: "e", title: "E", starts_at: "2026-12-20T20:00:00Z", status: "published", venue_name: null, is_free: free, price_from_ngn: from, price_to_ngn: to, lat: null, lng: null } });
    expect(estimateCost([v(3000, 9000), v(null, null), e(10000, 25000), e(null, null, true), e(null, null)])).toEqual({ low: 13000, high: 34000, priced: 3, unpriced: 2 });
  });
});

d("P2 · lists", () => {
  let owner: TestUser;
  let other: TestUser;
  let vendorId = "";
  let listId = "";
  let token = "";

  beforeAll(async () => {
    [owner, other] = await Promise.all([createUser("p2-owner"), createUser("p2-other")]);
    vendorId = (await createPublishedVendor("p2")).id;
    await serviceClient().from("vendor_prices").insert([{ vendor_id: vendorId, label: "Entry", amount_ngn: 5000 }, { vendor_id: vendorId, label: "Bottle", amount_ngn: 60000 }]);
  });
  afterAll(cleanup);

  it("create + add through the owner's own client (RLS); the token is server-generated", async () => {
    const s = await sessionFor(owner);
    const created = await createList(s, { title: "Saturday on the Island" });
    listId = created.id;
    token = created.share_token;
    expect(token).toMatch(/^[A-Za-z0-9_-]{12}$/);
    await addToList(s, { listId, vendorId, note: "Arrive before 11" });
    await expect(addToList(s, { listId, vendorId })).rejects.toThrow(/already on that list/);
    const forged = await owner.client.from("lists").insert({ title: "x", share_token: "AAAAAAAAAAAA" } as never);
    expect(forged.error).not.toBeNull();
  });

  it("lists are private to their owner (other users and anon see nothing, can't write)", async () => {
    expect((await other.client.from("lists").select("id").eq("id", listId)).data).toEqual([]);
    expect((await other.client.from("list_items").select("id").eq("list_id", listId)).data).toEqual([]);
    const hijack = await other.client.from("list_items").insert({ list_id: listId, vendor_id: vendorId });
    expect(hijack.error).not.toBeNull();
    const rename = await other.client.from("lists").update({ title: "pwned" }).eq("id", listId).select("id");
    expect(rename.data ?? []).toEqual([]);
    expect((await anonClient().from("lists").select("id")).error?.code).toBe("42501");
  });

  it("the share link only works once the owner makes the list public — and then works logged-out", async () => {
    expect(await getSharedList(token)).toBeNull();
    const { data: anonPrivate } = await anonClient().rpc("get_shared_list", { p_token: token });
    expect(anonPrivate).toBeNull();
    await updateList(await sessionFor(owner), { listId, isPublic: true });
    const shared = await getSharedList(token);
    expect(shared).toMatchObject({ title: "Saturday on the Island", owner: { username: expect.any(String) } });
    expect(shared!.items).toHaveLength(1);
    expect(shared!.items[0]).toMatchObject({ kind: "vendor", note: "Arrive before 11", vendor: { min_price: 5000, max_price: 60000 } });
    expect(JSON.stringify(shared)).not.toMatch(/owner_id|email/);
    expect(await getSharedList("not-a-token!")).toBeNull();
  });

  it("view counting is rate-limited per IP per list", async () => {
    const before = (await serviceClient().from("lists").select("view_count").eq("id", listId).single()).data!.view_count;
    await countListView(token, "198.51.100.23");
    await countListView(token, "198.51.100.23");
    const after = (await serviceClient().from("lists").select("view_count, updated_at").eq("id", listId).single()).data!;
    expect(after.view_count).toBe(before + 1);
    const { data: audit } = await serviceClient().rpc("admin_list_audit", { p_entity_id: listId, p_limit: 50 });
    const vc = (j: unknown) => (j as { view_count?: number } | null)?.view_count;
    // A view must not write an audit row (only real edits — title, visibility, city — are audited).
    expect((audit ?? []).filter((a) => vc(a.before) !== undefined && vc(a.before) !== vc(a.after)).length).toBe(0);
  });

  it("blocked wording can't be saved (titles and notes become public)", async () => {
    const svc = serviceClient();
    const phrase = `zzblocked${Date.now().toString(36)}`;
    const { data: st } = await svc.from("platform_settings").select("blocklist_phrases").eq("id", 1).single();
    await svc.from("platform_settings").update({ blocklist_phrases: [...st!.blocklist_phrases, phrase] }).eq("id", 1);
    try {
      await expect(createList(await sessionFor(owner), { title: `Night ${phrase}` })).rejects.toBeInstanceOf(ListError);
    } finally {
      await svc.from("platform_settings").update({ blocklist_phrases: st!.blocklist_phrases }).eq("id", 1);
    }
  });

  it("at most 20 lists per user (enforced in the database)", async () => {
    const svc = serviceClient();
    const rows = Array.from({ length: 19 }, (_, i) => ({ owner_id: other.id, title: `L${i}` }));
    await svc.from("lists").insert(rows);
    const twentieth = await other.client.from("lists").insert({ title: "twentieth" });
    expect(twentieth.error).toBeNull();
    const extra = await other.client.from("lists").insert({ title: "one too many" });
    expect(extra.error?.message).toMatch(/up to 20 lists/);
  });
});
