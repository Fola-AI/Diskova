/**
 * Stage L2 acceptance (PRD §14): anon cannot read private.* / hidden posts / other users' holds;
 * a shadowbanned author sees their own post and others don't; pg_cron jobs are listed; seed loads.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  anonClient,
  cleanup,
  createPublishedVendor,
  createUser,
  hasDevEnv,
  serviceClient,
  type TestUser,
} from "./helpers";

const d = hasDevEnv ? describe : describe.skip;

d("L2 · private schema is never reachable through the Data API", () => {
  it("anon gets an invalid-schema error for private tables", async () => {
    const res = await anonClient().schema("private" as "public").from("audit_log" as "posts").select("*").limit(1);
    expect(res.error).not.toBeNull();
    expect(res.data).toBeNull();
  });

  it("even the service role cannot reach private tables through PostgREST", async () => {
    const res = await serviceClient()
      .schema("private" as "public")
      .from("issue_reports" as "posts")
      .select("*")
      .limit(1);
    expect(res.error).not.toBeNull();
  });

  it("the project's exposed schemas do not include private (Management API)", async () => {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    const ref = process.env.SUPABASE_PROJECT_REF;
    if (!token || !ref) return;
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/postgrest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { db_schema: string };
    const schemas = body.db_schema.split(",").map((s) => s.trim());
    expect(schemas).toContain("public");
    expect(schemas).not.toContain("private");
  });

  it("service-role-only RPCs are denied to anon", async () => {
    const res = await anonClient().rpc("admin_list_cron_jobs");
    expect(res.error).not.toBeNull();
  });
});

d("L2 · posts visibility (holds, hidden, shadowban)", () => {
  let author: TestUser;
  let other: TestUser;
  let shadow: TestUser;
  let vendorId: string;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    [author, other, shadow] = await Promise.all([
      createUser("author"),
      createUser("other"),
      createUser("shadow"),
    ]);
    vendorId = (await createPublishedVendor("posts")).id;
    const admin = serviceClient();

    // Author creates a check-in through their own client (RLS insert path) → pending by default.
    const pending = await author.client
      .from("posts")
      .insert({ author_id: author.id, vendor_id: vendorId, kind: "checkin", crowd_level: 3, vibe: 4 })
      .select("id, status")
      .single();
    if (pending.error) throw pending.error;
    ids.pending = pending.data.id;

    // Held photo post (what the pipeline does for new / low-trust accounts).
    const held = await author.client
      .from("posts")
      .insert({ author_id: author.id, vendor_id: vendorId, kind: "checkin", crowd_level: 4 })
      .select("id")
      .single();
    if (held.error) throw held.error;
    ids.held = held.data.id;
    await admin.from("posts").update({ hold_reason: "media_new_account" }).eq("id", ids.held);

    // Published, then hidden.
    const hidden = await author.client
      .from("posts")
      .insert({ author_id: author.id, vendor_id: vendorId, kind: "checkin", crowd_level: 2 })
      .select("id")
      .single();
    if (hidden.error) throw hidden.error;
    ids.hidden = hidden.data.id;
    await admin.from("posts").update({ status: "hidden", moderation_decision: "auto_block" }).eq("id", ids.hidden);

    // Published normal post.
    const published = await author.client
      .from("posts")
      .insert({ author_id: author.id, vendor_id: vendorId, kind: "checkin", crowd_level: 5 })
      .select("id")
      .single();
    if (published.error) throw published.error;
    ids.published = published.data.id;
    await admin.from("posts").update({ status: "published", moderation_decision: "auto_pass" }).eq("id", ids.published);

    // Shadowbanned author's published post.
    const sb = await shadow.client
      .from("posts")
      .insert({ author_id: shadow.id, vendor_id: vendorId, kind: "checkin", crowd_level: 3 })
      .select("id")
      .single();
    if (sb.error) throw sb.error;
    ids.shadow = sb.data.id;
    await admin.from("posts").update({ status: "published", moderation_decision: "auto_pass" }).eq("id", ids.shadow);
    const sanction = await admin
      .from("user_sanctions")
      .insert({ profile_id: shadow.id, kind: "shadowban", reason: "RLS test shadowban" });
    if (sanction.error) throw sanction.error;
  });

  afterAll(async () => {
    await cleanup();
  });

  async function visibleIds(client = anonClient()): Promise<Set<string>> {
    const { data, error } = await client.from("posts").select("id").eq("vendor_id", vendorId);
    if (error) throw error;
    return new Set(data.map((r) => r.id));
  }

  it("new posts default to pending (API callers cannot choose status)", async () => {
    const { data } = await serviceClient().from("posts").select("status").eq("id", ids.pending).single();
    expect(data?.status).toBe("pending");
  });

  it("anon sees only the published post from a non-shadowbanned author", async () => {
    const seen = await visibleIds();
    expect(seen.has(ids.published)).toBe(true);
    expect(seen.has(ids.pending)).toBe(false);
    expect(seen.has(ids.held)).toBe(false);
    expect(seen.has(ids.hidden)).toBe(false);
    expect(seen.has(ids.shadow)).toBe(false);
  });

  it("another signed-in user cannot see the author's pending, held or hidden posts", async () => {
    const seen = await visibleIds(other.client);
    expect(seen.has(ids.published)).toBe(true);
    expect(seen.has(ids.pending)).toBe(false);
    expect(seen.has(ids.held)).toBe(false);
    expect(seen.has(ids.hidden)).toBe(false);
  });

  it("the author sees all of their own posts, including held ones", async () => {
    const seen = await visibleIds(author.client);
    for (const key of ["pending", "held", "hidden", "published"]) {
      expect(seen.has(ids[key]), key).toBe(true);
    }
  });

  it("shadowbanned author still sees their own post; others do not", async () => {
    expect((await visibleIds(shadow.client)).has(ids.shadow)).toBe(true);
    expect((await visibleIds(other.client)).has(ids.shadow)).toBe(false);
    expect((await visibleIds(anonClient())).has(ids.shadow)).toBe(false);
  });

  it("the shadowban flag is not readable by API roles, and is hidden from the user's own sanctions", async () => {
    const flag = await other.client.from("profiles").select("is_shadowbanned").eq("id", shadow.id);
    expect(flag.error).not.toBeNull();
    const own = await shadow.client.from("user_sanctions").select("kind").eq("profile_id", shadow.id);
    expect(own.error).toBeNull();
    expect(own.data?.some((s) => s.kind === "shadowban")).toBe(false);
    const me = await shadow.client.rpc("get_my_profile");
    expect(me.error).toBeNull();
    expect(me.data?.[0]).not.toHaveProperty("is_shadowbanned");
  });

  it("a pulse publishes immediately with no text", async () => {
    const res = await other.client
      .from("posts")
      .insert({ author_id: other.id, vendor_id: vendorId, kind: "pulse", crowd_level: 4 })
      .select("id, status, body")
      .single();
    expect(res.error).toBeNull();
    expect(res.data?.status).toBe("published");
    expect(res.data?.body).toBeNull();
  });

  it("users cannot post as someone else", async () => {
    const res = await other.client
      .from("posts")
      .insert({ author_id: author.id, vendor_id: vendorId, kind: "checkin", crowd_level: 3 });
    expect(res.error).not.toBeNull();
  });

  it("users cannot set server-owned columns (status, verified)", async () => {
    const res = await other.client
      .from("posts")
      .insert({ author_id: other.id, vendor_id: vendorId, kind: "checkin", crowd_level: 3, status: "published" });
    expect(res.error).not.toBeNull();
  });

  it("non-members cannot post official updates", async () => {
    const res = await other.client
      .from("posts")
      .insert({ author_id: other.id, vendor_id: vendorId, kind: "official", crowd_level: 3 });
    expect(res.error).not.toBeNull();
  });

  it("anon cannot post", async () => {
    const res = await anonClient()
      .from("posts")
      .insert({ author_id: author.id, vendor_id: vendorId, kind: "pulse", crowd_level: 3 });
    expect(res.error).not.toBeNull();
  });

  it("an unverified user cannot post", async () => {
    const unverified = await createUser("unverified", { verified: false });
    const res = await unverified.client
      .from("posts")
      .insert({ author_id: unverified.id, vendor_id: vendorId, kind: "pulse", crowd_level: 3 });
    expect(res.error).not.toBeNull();
  });

  it("other users' private profile fields are not readable", async () => {
    const res = await other.client.from("profiles").select("trust_score, role, status").eq("id", author.id);
    expect(res.error).not.toBeNull();
    const pub = await anonClient().from("v_public_profiles").select("username").eq("id", author.id).single();
    expect(pub.error).toBeNull();
    expect(pub.data?.username).toBeTruthy();
  });

  it("moderation queue and sanctions of others are invisible to non-staff", async () => {
    const mod = await other.client.from("moderation_items").select("id").limit(5);
    expect(mod.error).toBeNull();
    expect(mod.data).toEqual([]);
    const sanctions = await other.client.from("user_sanctions").select("id").eq("profile_id", shadow.id);
    expect(sanctions.data).toEqual([]);
  });

  it("an auto-blocked post was queued for moderation (P1)", async () => {
    const { data } = await serviceClient()
      .from("moderation_items")
      .select("priority, source")
      .eq("entity_id", ids.hidden);
    expect(data).toEqual(expect.arrayContaining([{ priority: 1, source: "auto_block" }]));
  });
});

d("L2 · pg_cron and seed", () => {
  it("lists the scheduled pg_cron jobs", async () => {
    const { data, error } = await serviceClient().rpc("admin_list_cron_jobs");
    expect(error).toBeNull();
    const names = (data ?? []).map((j) => j.jobname);
    expect(names).toEqual(
      expect.arrayContaining(["crowd-snapshots", "crowd-forecast", "leaderboards", "daily-purges", "partman-maintenance"]),
    );
    const snap = data?.find((j) => j.jobname === "crowd-snapshots");
    expect(snap?.schedule).toBe("*/5 * * * *");
    expect(snap?.active).toBe(true);
  });

  it("seed loaded: 6 cities, 40 areas, 19 categories, 60 sample vendors, 12 toolkit drafts", async () => {
    const admin = serviceClient();
    const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count;
    expect(await count(admin.from("cities").select("*", { count: "exact", head: true }))).toBe(6);
    expect(await count(admin.from("areas").select("*", { count: "exact", head: true }))).toBe(40);
    expect(await count(admin.from("categories").select("*", { count: "exact", head: true }))).toBe(19);
    // seed.sql inserts them as drafts; on DEV `npm run db:samples` may publish them for directory QA.
    expect(await count(admin.from("vendors").select("*", { count: "exact", head: true }).eq("is_seed", true))).toBe(60);
    expect(
      await count(admin.from("guides").select("*", { count: "exact", head: true }).eq("type", "toolkit")),
    ).toBe(12);
  });

  it("platform settings expose public fields only", async () => {
    const ok = await anonClient().from("platform_settings").select("december_season_start, december_season_end").single();
    expect(ok.error).toBeNull();
    expect(ok.data?.december_season_start).toBe("2026-11-15");
    const secret = await anonClient().from("platform_settings").select("blocklist_phrases").single();
    expect(secret.error).not.toBeNull();
  });
});

d("L2 · vendor ownership and status guard", () => {
  let owner: TestUser;
  let vendorId: string;

  beforeAll(async () => {
    owner = await createUser("owner");
    const admin = serviceClient();
    const { data: city } = await admin.from("cities").select("id").eq("slug", "abuja").single();
    const { data: cat } = await admin.from("categories").select("id").eq("slug", "bar").single();
    const res = await owner.client
      .from("vendors")
      .insert({
        slug: `rls-owned-${owner.id.slice(0, 8)}`,
        name: "RLS Owned Venue",
        category_id: cat!.id,
        city_id: city!.id,
        location: "SRID=4326;POINT(7.47 9.079)",
        owner_profile_id: owner.id,
      })
      .select("id, status, claim_status")
      .single();
    if (res.error) throw res.error;
    vendorId = res.data.id;
    expect(res.data.status).toBe("draft");
    expect(res.data.claim_status).toBe("claimed");
  });

  afterAll(async () => {
    await serviceClient().from("vendors").delete().eq("id", vendorId);
    await cleanup();
  });

  it("creating a vendor makes the creator its owner member and a vendor_member", async () => {
    const { data } = await owner.client.from("vendor_members").select("role").eq("vendor_id", vendorId).single();
    expect(data?.role).toBe("owner");
    const me = await owner.client.rpc("get_my_profile");
    expect(me.data?.[0]?.role).toBe("vendor_member");
  });

  it("the owner can submit for review but cannot publish or verify", async () => {
    const submit = await owner.client.from("vendors").update({ status: "pending_review" }).eq("id", vendorId);
    expect(submit.error).toBeNull();
    const publish = await owner.client.from("vendors").update({ status: "published" }).eq("id", vendorId);
    expect(publish.error?.code).toBe("42501");
    const verify = await owner.client.from("vendors").update({ verified: true } as never).eq("id", vendorId);
    expect(verify.error).not.toBeNull();
  });

  it("a draft vendor is invisible to anon", async () => {
    const { data } = await anonClient().from("vendors").select("id").eq("id", vendorId);
    expect(data).toEqual([]);
  });
});
