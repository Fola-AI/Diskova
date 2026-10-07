/**
 * Stage L8 acceptance against DEV with REAL OpenAI moderation:
 * threatening text auto-hidden (P1); blocklist auto-block; pulse never held; 3 reports hide;
 * burst escalates; human decisions adjust trust, award held points, sanction, resolve reports, audit.
 */
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decideModerationItem } from "@/lib/services/admin/moderation";
import { attachCheckinPhoto, createCheckin, createPulse, finalizeCheckin } from "@/lib/services/posts";
import { reportContent } from "@/lib/services/reports";

import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv && process.env.OPENAI_API_KEY ? describe : describe.skip;
const meta = { ip: null };
const staffMeta = { ip: null, userAgent: "vitest" };

async function age(id: string, days: number, trust = 50) {
  await serviceClient().from("profiles").update({ created_at: new Date(Date.now() - days * 86_400_000).toISOString(), trust_score: trust }).eq("id", id);
}
async function itemsFor(postId: string) {
  const { data } = await serviceClient().from("moderation_items").select("id, source, priority, status").eq("entity_id", postId);
  return data ?? [];
}
async function profile(id: string) {
  const { data } = await serviceClient().from("profiles").select("trust_score, status, points").eq("id", id).single();
  return data!;
}

d("L8 · moderation pipeline", () => {
  let author: TestUser;
  let newbie: TestUser;
  let mod: TestUser;
  let r1: TestUser;
  let r2: TestUser;
  let r3: TestUser;
  let vendorId: string;
  let vendor2: string;

  beforeAll(async () => {
    [author, newbie, mod, r1, r2, r3] = await Promise.all(
      ["l8-author", "l8-newbie", "l8-mod", "l8-r1", "l8-r2", "l8-r3"].map((l) => createUser(l)),
    );
    await age(author.id, 60);
    await serviceClient().from("profiles").update({ role: "moderator" }).eq("id", mod.id);
    vendorId = (await createPublishedVendor("l8")).id;
    vendor2 = (await createPublishedVendor("l8b")).id;
  });

  afterAll(async () => {
    await serviceClient().from("platform_settings").update({ blocklist_phrases: [] }).eq("id", 1);
    await cleanup();
  });

  it("threatening text is auto-hidden and queued P1; the author still sees it", async () => {
    const s = await sessionFor(author);
    const c = await createCheckin(s, { vendorId, crowdLevel: 3, vibe: 3, photoCount: 0, note: "I will find you and kill you, you worthless piece of trash" }, meta);
    const res = await finalizeCheckin(s, c.postId);
    expect(res).toMatchObject({ status: "hidden", decision: "auto_block" });
    expect(await itemsFor(c.postId)).toEqual(expect.arrayContaining([expect.objectContaining({ source: "auto_block", priority: 1 })]));
    expect((await anonClient().from("posts").select("id").eq("id", c.postId)).data).toEqual([]);
    expect((await author.client.from("posts").select("id").eq("id", c.postId)).data).toHaveLength(1);
  });

  it("clean text auto-passes", async () => {
    const s = await sessionFor(author);
    const c = await createCheckin(s, { vendorId, crowdLevel: 3, vibe: 4, photoCount: 0, note: "Lovely evening, great music and friendly staff" }, meta);
    expect(await finalizeCheckin(s, c.postId)).toMatchObject({ status: "published", decision: "auto_pass" });
  });

  it("an admin blocklist phrase auto-blocks without calling the provider", async () => {
    const phrase = `promo-${Date.now().toString(36)}`;
    await serviceClient().from("platform_settings").update({ blocklist_phrases: [phrase] }).eq("id", 1);
    const s = await sessionFor(author);
    const c = await createCheckin(s, { vendorId: vendor2, crowdLevel: 2, vibe: 2, photoCount: 0, note: `Use code ${phrase.toUpperCase()} for free drinks` }, meta);
    expect(await finalizeCheckin(s, c.postId)).toMatchObject({ status: "hidden", decision: "auto_block" });
    await serviceClient().from("platform_settings").update({ blocklist_phrases: [] }).eq("id", 1);
  });

  it("a pulse is never held, even from a brand-new zero-trust account", async () => {
    await age(newbie.id, 0, 0);
    const s = await sessionFor(newbie);
    const p = await createPulse(s, { vendorId, crowdLevel: 4 }, meta);
    const { data } = await anonClient().from("posts").select("status").eq("id", p.postId).single();
    expect(data?.status).toBe("published");
  });

  it("three reports hide a published post and queue it P1", async () => {
    const s = await sessionFor(author);
    const c = await createCheckin(s, { vendorId: vendor2, crowdLevel: 5, vibe: 5, photoCount: 0 }, meta);
    await finalizeCheckin(s, c.postId);
    for (const u of [r1, r2, r3]) await reportContent(await sessionFor(u), { entityType: "post", entityId: c.postId, reason: "fake" });
    const { data } = await serviceClient().from("posts").select("status, report_count").eq("id", c.postId).single();
    expect(data).toEqual({ status: "hidden", report_count: 3 });
    expect(await itemsFor(c.postId)).toEqual(expect.arrayContaining([expect.objectContaining({ source: "user_report", priority: 1 })]));

    // Human removal for a "fake" post: −25 trust, warning sanction → status warned, reports resolved, audited.
    const before = await profile(author.id);
    const item = (await itemsFor(c.postId)).find((i) => i.status !== "done")!;
    await decideModerationItem(await sessionFor(mod), { itemId: item.id, action: "remove_warn", reason: "Fake crowd report" }, staffMeta);
    const after = await profile(author.id);
    expect(after.trust_score).toBe(before.trust_score - 25);
    expect(after.status).toBe("warned");
    const { data: reports } = await serviceClient().from("reports").select("status").eq("entity_id", c.postId);
    expect(reports?.every((r) => r.status === "resolved_removed")).toBe(true);
    expect((await itemsFor(c.postId)).every((i) => i.status === "done")).toBe(true);
    const { data: audit } = await serviceClient().rpc("admin_list_audit", { p_entity_id: c.postId, p_action_prefix: "moderation." });
    expect(audit?.[0]).toMatchObject({ action: "moderation.remove_warn", actor_id: mod.id, reason: "Fake crowd report" });
  });

  it("approving a held photo post publishes it, awards points and adds +2 trust", async () => {
    const s = await sessionFor(newbie); // account age 0 → photo held
    const c = await createCheckin(s, { vendorId: vendor2, crowdLevel: 3, vibe: 3, photoCount: 1 }, meta);
    const img = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#0B7A3B" } }).jpeg().toBuffer();
    const path = `${newbie.id}/${"b".repeat(16)}.jpg`;
    await serviceClient().storage.from("media-incoming").upload(path, img, { contentType: "image/jpeg" });
    await attachCheckinPhoto(s, c.postId, path);
    expect(await finalizeCheckin(s, c.postId)).toMatchObject({ status: "pending", holdReason: "media_new_account", points: 0 });

    const before = await profile(newbie.id);
    const hold = (await itemsFor(c.postId)).find((i) => i.source === "hold")!;
    await decideModerationItem(await sessionFor(mod), { itemId: hold.id, action: "approve" }, staffMeta);
    const { data: post } = await anonClient().from("posts").select("status").eq("id", c.postId).single();
    expect(post?.status).toBe("published");
    const after = await profile(newbie.id);
    expect(after.trust_score).toBe(before.trust_score + 2);
    expect(after.points).toBeGreaterThan(before.points);

    const { data: media } = await serviceClient().from("post_media").select("storage_path").eq("post_id", c.postId);
    await serviceClient().storage.from("media").remove((media ?? []).map((m) => m.storage_path));
  });

  it("removal without a reason is refused", async () => {
    const s = await sessionFor(author);
    const c = await createCheckin(s, { vendorId, crowdLevel: 1, vibe: 1, photoCount: 0, note: "I will find you and kill you" }, meta);
    await finalizeCheckin(s, c.postId);
    const item = (await itemsFor(c.postId))[0];
    await expect(decideModerationItem(await sessionFor(mod), { itemId: item.id, action: "remove" }, staffMeta)).rejects.toThrow(/reason is required/);
  });

  it("more than 3 posts in 10 minutes escalates to P1", async () => {
    const burster = await createUser("l8-burst");
    await age(burster.id, 30);
    const s = await sessionFor(burster);
    let last = "";
    for (const v of [vendorId, vendorId, vendor2, vendor2]) last = (await createPulse(s, { vendorId: v, crowdLevel: 3 }, meta)).postId;
    expect(await itemsFor(last)).toEqual(expect.arrayContaining([expect.objectContaining({ priority: 1 })]));
  });

  it("a moderator shadowban hides the author's posts from everyone else", async () => {
    const target = await createUser("l8-shadow");
    await age(target.id, 30);
    const s = await sessionFor(target);
    const c = await createCheckin(s, { vendorId, crowdLevel: 2, vibe: 2, photoCount: 0, note: "fine night" }, meta);
    await finalizeCheckin(s, c.postId);
    expect((await anonClient().from("posts").select("id").eq("id", c.postId)).data).toHaveLength(1);
    await serviceClient().from("moderation_items").insert({ entity_type: "post", entity_id: c.postId, priority: 3, source: "random_sample" });
    const item = (await itemsFor(c.postId)).find((i) => i.status !== "done")!;
    await decideModerationItem(await sessionFor(mod), { itemId: item.id, action: "shadowban", reason: "Repeated fake check-ins" }, staffMeta);
    expect((await anonClient().from("posts").select("id").eq("id", c.postId)).data).toEqual([]);
    expect((await target.client.from("posts").select("id").eq("id", c.postId)).data).toHaveLength(1);
  });
});
