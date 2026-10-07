/**
 * Stage L6 integration (services against DEV, real user sessions under RLS):
 * pulse/check-in publishing, holds, point rules, first-at-venue bonus, idempotency and the daily cap.
 */
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { SessionContext } from "@/lib/auth/guards";
import { awardForPost, DAILY_CAP } from "@/lib/services/points";
import { attachCheckinPhoto, createCheckin, createPulse, finalizeCheckin, toggleLike } from "@/lib/services/posts";
import { reportContent } from "@/lib/services/reports";

import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";

const d = hasDevEnv ? describe : describe.skip;

async function sessionFor(u: TestUser): Promise<SessionContext> {
  const { data } = await u.client.rpc("get_my_profile");
  const { data: auth } = await u.client.auth.getUser();
  return { supabase: u.client as never, user: auth.user!, profile: data![0] } as SessionContext;
}

async function ageAccount(id: string, days: number) {
  await serviceClient().from("profiles").update({ created_at: new Date(Date.now() - days * 86_400_000).toISOString() }).eq("id", id);
}

async function pointsOf(id: string): Promise<number> {
  const { data } = await serviceClient().from("profiles").select("points").eq("id", id).single();
  return data!.points;
}

d("L6 · posts, holds and points", () => {
  let veteran: TestUser;
  let second: TestUser;
  let newbie: TestUser;
  let vendorId: string;
  const meta = { ip: null };

  beforeAll(async () => {
    [veteran, second, newbie] = await Promise.all([createUser("l6-vet"), createUser("l6-second"), createUser("l6-new")]);
    await ageAccount(veteran.id, 30);
    await ageAccount(second.id, 30);
    vendorId = (await createPublishedVendor("l6")).id;
  });

  afterAll(cleanup);

  it("pulse publishes immediately and earns 1 point", async () => {
    const s = await sessionFor(veteran);
    const res = await createPulse(s, { vendorId, crowdLevel: 4 }, meta);
    expect(res.points).toBe(1);
    const { data } = await anonClient().from("posts").select("status, kind").eq("id", res.postId).single();
    expect(data).toEqual({ status: "published", kind: "pulse" });
    expect(await pointsOf(veteran.id)).toBe(1);
  });

  it("first check-in of the day at a venue earns 3 + 5; the next person earns 3", async () => {
    const s1 = await sessionFor(veteran);
    const c1 = await createCheckin(s1, { vendorId, crowdLevel: 3, vibe: 4, photoCount: 0, note: "Good crowd" }, meta);
    const r1 = await finalizeCheckin(s1, c1.postId);
    expect(r1).toMatchObject({ status: "published", decision: "auto_pass", points: 8 });

    const s2 = await sessionFor(second);
    const c2 = await createCheckin(s2, { vendorId, crowdLevel: 3, vibe: 3, photoCount: 0 }, meta);
    const r2 = await finalizeCheckin(s2, c2.postId);
    expect(r2.points).toBe(3);
  });

  it("points are awarded once per post", async () => {
    const { data: post } = await serviceClient()
      .from("posts")
      .select("id, author_id, vendor_id, kind, is_at_venue, created_at")
      .eq("author_id", second.id)
      .eq("kind", "checkin")
      .single();
    expect(await awardForPost(post!, { hasPhoto: false })).toBe(0);
  });

  it("a photo check-in from a new account is held (pending, invisible, no points)", async () => {
    const s = await sessionFor(newbie);
    const c = await createCheckin(s, { vendorId, crowdLevel: 5, vibe: 5, photoCount: 1 }, meta);
    const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#F4B400" } }).jpeg().toBuffer();
    const path = `${newbie.id}/${"a".repeat(16)}.jpg`;
    const up = await serviceClient().storage.from("media-incoming").upload(path, jpeg, { contentType: "image/jpeg" });
    expect(up.error).toBeNull();
    await attachCheckinPhoto(s, c.postId, path);
    const res = await finalizeCheckin(s, c.postId);
    expect(res).toMatchObject({ status: "pending", holdReason: "media_new_account", points: 0, photos: 1 });
    const { data: anon } = await anonClient().from("posts").select("id").eq("id", c.postId);
    expect(anon).toEqual([]);
    const { data: queue } = await serviceClient().from("moderation_items").select("source, priority").eq("entity_id", c.postId);
    expect(queue).toEqual(expect.arrayContaining([{ source: "hold", priority: 2 }]));
    // clean up the stored photo
    const { data: media } = await serviceClient().from("post_media").select("storage_path").eq("post_id", c.postId);
    await serviceClient().storage.from("media").remove((media ?? []).map((m) => m.storage_path));
  });

  it("enforces the 60-point daily cap", async () => {
    const admin = serviceClient();
    const already = await pointsOf(veteran.id);
    await admin.from("point_events").insert({ profile_id: veteran.id, kind: "streak", points: DAILY_CAP - already - 2 });
    const s = await sessionFor(veteran);
    // A fresh venue so the first-at-venue bonus would apply (and must be capped).
    const v2 = (await createPublishedVendor("l6-cap")).id;
    const c = await createCheckin(s, { vendorId: v2, crowdLevel: 2, vibe: 2, photoCount: 0 }, meta);
    const res = await finalizeCheckin(s, c.postId);
    expect(res.points).toBe(2);
    expect(await pointsOf(veteran.id)).toBe(DAILY_CAP);
  });

  it("likes toggle and are counted once per user", async () => {
    const { data: post } = await serviceClient().from("posts").select("id").eq("author_id", second.id).eq("kind", "checkin").single();
    const s = await sessionFor(veteran);
    expect(await toggleLike(s, post!.id)).toEqual({ liked: true, count: 1 });
    expect(await toggleLike(s, post!.id)).toEqual({ liked: false, count: 0 });
  });

  it("a post's location, distance and moderation internals are not readable by API roles", async () => {
    for (const client of [anonClient(), second.client]) {
      for (const col of ["location", "distance_from_venue_m", "moderation_score", "report_count", "moderated_by"]) {
        const res = await client.from("posts").select(col).eq("vendor_id", vendorId).limit(1);
        expect(res.error?.code, col).toBe("42501");
      }
      const media = await client.from("post_media").select("phash, moderation_score").limit(1);
      expect(media.error?.code).toBe("42501");
    }
    const ok = await anonClient().from("posts").select("id, crowd_level, is_at_venue").eq("vendor_id", vendorId).limit(1);
    expect(ok.error).toBeNull();
  });

  it("reports are one per user per item", async () => {
    const { data: post } = await serviceClient().from("posts").select("id").eq("author_id", second.id).eq("kind", "checkin").single();
    const s = await sessionFor(newbie);
    await reportContent(s, { entityType: "post", entityId: post!.id, reason: "spam" });
    await expect(reportContent(s, { entityType: "post", entityId: post!.id, reason: "spam" })).rejects.toThrow(/already reported/);
  });
});
