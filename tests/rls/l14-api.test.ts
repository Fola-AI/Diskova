/** Stage L14 · public JSON API (§9): envelope, filters, errors, auth on writes. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as cities } from "@/app/api/v1/cities/route";
import { GET as cityLive } from "@/app/api/v1/cities/[slug]/live/route";
import { GET as events } from "@/app/api/v1/events/route";
import { GET as guides } from "@/app/api/v1/guides/route";
import { GET as leaderboard } from "@/app/api/v1/leaderboard/[city]/route";
import { POST as posts } from "@/app/api/v1/posts/route";
import { POST as pulse } from "@/app/api/v1/pulse/route";
import { POST as reports } from "@/app/api/v1/reports/route";
import { GET as vendor } from "@/app/api/v1/vendors/[slug]/route";
import { GET as vendorPosts } from "@/app/api/v1/vendors/[slug]/posts/route";
import { GET as vendors } from "@/app/api/v1/vendors/route";

import { cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";

const d = hasDevEnv ? describe : describe.skip;
type Env<T = unknown> = { data: T; error: { code: string; message: string } | null; meta: Record<string, unknown> };
const BASE = "http://localhost/api/v1";
const get = (path: string) => new Request(`${BASE}${path}`, { headers: { "x-forwarded-for": "198.51.100.7" } });
const post = (path: string, body: unknown, token?: string) =>
  new Request(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
const p = <T extends Record<string, string>>(v: T) => ({ params: Promise.resolve(v) });
async function body<T>(res: Response): Promise<Env<T>> {
  return (await res.json()) as Env<T>;
}

d("L14 · public API /api/v1", () => {
  let user: TestUser;
  let token = "";
  let v: { id: string; slug: string };

  beforeAll(async () => {
    user = await createUser("l14-api");
    token = (await user.client.auth.getSession()).data.session!.access_token;
    v = await createPublishedVendor("l14-api");
  });
  afterAll(cleanup);

  it("GET /cities → envelope with launch cities, CORS-open and cacheable", async () => {
    const res = await cities(get("/cities"), undefined as never);
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const b = await body<Array<{ slug: string }>>(res);
    expect(b.error).toBeNull();
    expect(b.data.map((c) => c.slug)).toEqual(expect.arrayContaining(["lagos", "abuja"]));
    expect(b.meta.generated_at).toBeTruthy();
  });

  it("GET /vendors needs a city or q; filters by city; 404s unknown cities", async () => {
    expect((await vendors(get("/vendors"), undefined as never)).status).toBe(400);
    expect((await vendors(get("/vendors?city=atlantis"), undefined as never)).status).toBe(404);
    const b = await body<Array<{ slug: string; opening_hours?: unknown }>>(await vendors(get("/vendors?city=lagos&limit=200"), undefined as never));
    expect(b.data.map((x) => x.slug)).toContain(v.slug);
    expect(b.data[0]).not.toHaveProperty("opening_hours");
    const bad = await body(await vendors(get("/vendors?city=lagos&price=cheap"), undefined as never));
    expect(bad.error?.code).toBe("invalid_request");
  });

  it("GET /vendors/:slug and /posts; unknown slug → 404 envelope", async () => {
    const one = await body<{ slug: string; prices: unknown[] }>(await vendor(get(`/vendors/${v.slug}`), p({ slug: v.slug })));
    expect(one.data.slug).toBe(v.slug);
    expect(Array.isArray(one.data.prices)).toBe(true);
    const missing = await vendor(get("/vendors/nope-nope"), p({ slug: "nope-nope" }));
    expect(missing.status).toBe(404);
    expect((await body(missing)).error?.code).toBe("not_found");
    const feed = await body<unknown[]>(await vendorPosts(get(`/vendors/${v.slug}/posts`), p({ slug: v.slug })));
    expect(Array.isArray(feed.data)).toBe(true);
    expect(String(feed.meta.label)).toContain("Unverified");
  });

  it("GET /cities/:slug/live, /events, /guides, /leaderboard/:city respond with envelopes", async () => {
    expect((await cityLive(get("/cities/lagos/live"), p({ slug: "lagos" }))).status).toBe(200);
    expect((await body<unknown[]>(await events(get("/events?city=lagos&season=december"), undefined as never))).error).toBeNull();
    const g = await body<Array<{ url: string }>>(await guides(get("/guides?type=city_guide&city=lagos"), undefined as never));
    expect(g.error).toBeNull();
    expect((await leaderboard(get("/leaderboard/lagos"), p({ city: "lagos" }))).status).toBe(200);
  });

  it("writes need a valid Bearer token", async () => {
    const res = await pulse(post("/pulse", { vendorId: v.id, crowdLevel: 3 }), undefined as never);
    expect(res.status).toBe(401);
    expect((await pulse(post("/pulse", { vendorId: v.id, crowdLevel: 3 }, "not.a.real.token.xxxxxxxxxxxx"), undefined as never)).status).toBe(401);
  });

  it("POST /pulse publishes through the service (and RLS) as the token's user; bad input → 400", async () => {
    expect((await pulse(post("/pulse", { vendorId: v.id, crowdLevel: 9 }, token), undefined as never)).status).toBe(400);
    const res = await pulse(post("/pulse", { vendorId: v.id, crowdLevel: 4 }, token), undefined as never);
    expect(res.status).toBe(201);
    const { data } = await body<{ postId: string }>(res);
    const { data: row } = await serviceClient().from("posts").select("author_id, kind, status").eq("id", data.postId).single();
    expect(row).toEqual({ author_id: user.id, kind: "pulse", status: "published" });
  });

  it("POST /posts creates a moderated text check-in; POST /reports files a report", async () => {
    const res = await posts(post("/posts", { vendorId: v.id, crowdLevel: 3, vibe: 4, note: "Good music tonight" }, token), undefined as never);
    expect(res.status).toBe(201);
    const { data } = await body<{ postId: string; status: string }>(res);
    expect(["published", "pending", "hidden"]).toContain(data.status);
    const rep = await reports(post("/reports", { entityType: "vendor", entityId: v.id, reason: "wrong_venue", details: "API test" }, token), undefined as never);
    expect(rep.status).toBe(201);
  });

  it("an unverified account is refused (403)", async () => {
    const u = await createUser("l14-unverified", { verified: false });
    const t = (await u.client.auth.getSession()).data.session!.access_token;
    const res = await pulse(post("/pulse", { vendorId: v.id, crowdLevel: 2 }, t), undefined as never);
    expect(res.status).toBe(403);
    expect((await body(res)).error?.code).toBe("email_unverified");
  });
});
