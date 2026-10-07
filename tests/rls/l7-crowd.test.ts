/**
 * Stage L7: crowd snapshot weighting (§6.11) on seeded posts, via the real SQL function.
 *  weight = age decay (<30 min 1.0 · 30–60 0.6 · 60–90 0.3 · older excluded) × kind (official ×3, at-venue ×2)
 *  excludes non-published posts and shadowbanned authors; confidence Σw < 2 low · 2–5 medium · > 5 high.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";

const d = hasDevEnv ? describe : describe.skip;

// A fixed instant far in the past so the live */5 cron never touches these buckets.
const NOW = new Date("2020-01-01T12:02:30Z");
const BUCKET = "2020-01-01T12:00:00+00:00";
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
const VENUE_POINT = "SRID=4326;POINT(3.4216 6.4281)"; // same as createPublishedVendor

d("L7 · crowd snapshot weighting", () => {
  let author: TestUser;
  let shadow: TestUser;
  const v: Record<"a" | "b" | "c", string> = { a: "", b: "", c: "" };

  async function post(vendorId: string, p: { kind: "checkin" | "pulse" | "official"; crowd: number; vibe?: number; minAgo: number; atVenue?: boolean; by?: TestUser; status?: "published" | "pending" }) {
    const { error } = await serviceClient().from("posts").insert({
      author_id: (p.by ?? author).id,
      vendor_id: vendorId,
      kind: p.kind,
      crowd_level: p.crowd,
      vibe: p.vibe ?? null,
      location: p.atVenue ? VENUE_POINT : null,
      status: p.status ?? "published",
      created_at: ago(p.minAgo),
    });
    if (error) throw error;
  }

  beforeAll(async () => {
    [author, shadow] = await Promise.all([createUser("crowd-author"), createUser("crowd-shadow")]);
    await serviceClient().from("user_sanctions").insert({ profile_id: shadow.id, kind: "shadowban", reason: "crowd test" });
    v.a = (await createPublishedVendor("crowd-a")).id;
    v.b = (await createPublishedVendor("crowd-b")).id;
    v.c = (await createPublishedVendor("crowd-c")).id;

    // A: one fresh official update on its own → weight 3 → medium.
    await post(v.a, { kind: "official", crowd: 5, minAgo: 5 });

    // B: the full mix.
    await post(v.b, { kind: "official", crowd: 5, vibe: 5, minAgo: 10 }); //            w 1.0 × 3 = 3
    await post(v.b, { kind: "checkin", crowd: 1, vibe: 2, minAgo: 20, atVenue: true }); // w 1.0 × 2 = 2
    await post(v.b, { kind: "checkin", crowd: 2, vibe: 3, minAgo: 45 }); //             w 0.6 × 1 = 0.6
    await post(v.b, { kind: "pulse", crowd: 4, minAgo: 75 }); //                         w 0.3 × 1 = 0.3
    await post(v.b, { kind: "checkin", crowd: 5, minAgo: 100 }); //                      excluded (> 90 min)
    await post(v.b, { kind: "checkin", crowd: 5, minAgo: 5, by: shadow }); //            excluded (shadowbanned)
    await post(v.b, { kind: "checkin", crowd: 5, minAgo: 5, status: "pending" }); //     excluded (not published)

    // C: a single 50-minute-old check-in → weight 0.6 → low.
    await post(v.c, { kind: "checkin", crowd: 3, minAgo: 50 });

    const { error } = await serviceClient().rpc("admin_refresh_crowd_snapshots", { p_now: NOW.toISOString() });
    if (error) throw error;
  });

  afterAll(cleanup);

  async function snapshot(vendorId: string) {
    const { data } = await serviceClient()
      .from("crowd_snapshots")
      .select("bucket_start, crowd_level_avg, crowd_level_mode, vibe_avg, post_count, official_count, at_venue_count, confidence")
      .eq("vendor_id", vendorId)
      .eq("bucket_start", BUCKET)
      .maybeSingle();
    return data;
  }

  it("one fresh official update alone yields medium confidence", async () => {
    expect(await snapshot(v.a)).toMatchObject({ crowd_level_avg: 5, official_count: 1, post_count: 0, confidence: "medium" });
  });

  it("applies official ×3, at-venue ×2 and age decay; excludes old, shadowbanned and unpublished posts", async () => {
    // (5×3 + 1×2 + 2×0.6 + 4×0.3) / (3 + 2 + 0.6 + 0.3) = 19.4 / 5.9 = 3.288…
    const s = await snapshot(v.b);
    expect(s).toMatchObject({ post_count: 3, official_count: 1, at_venue_count: 1, confidence: "high" });
    expect(Number(s!.crowd_level_avg)).toBeCloseTo(19.4 / 5.9, 2);
    // vibe only from posts that have one: (5×3 + 2×2 + 3×0.6) / (3 + 2 + 0.6) = 20.8 / 5.6
    expect(Number(s!.vibe_avg)).toBeCloseTo(20.8 / 5.6, 2);
  });

  it("an old single check-in yields low confidence", async () => {
    expect(await snapshot(v.c)).toMatchObject({ crowd_level_avg: 3, confidence: "low", post_count: 1 });
  });

  it("re-running the same bucket is idempotent (upsert)", async () => {
    await serviceClient().rpc("admin_refresh_crowd_snapshots", { p_now: NOW.toISOString() });
    const { count } = await serviceClient()
      .from("crowd_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", v.b)
      .eq("bucket_start", BUCKET);
    expect(count).toBe(1);
  });
});
