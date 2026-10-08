/** Stage P5 · AI assistant (real Groq): busy-in-Lekki answer with venue links; safety refusal; limits; logs. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { linkedVenues, segmentAnswer } from "@/lib/assistant/guardrails";
import { ask } from "@/lib/services/assistant";

import { cleanup, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";

const run = hasDevEnv && process.env.GROQ_API_KEY ? describe : describe.skip;

async function readAll(s: ReadableStream<string>): Promise<string> {
  let out = "";
  const r = s.getReader();
  for (;;) {
    const { value, done } = await r.read();
    if (done) return out;
    out += value;
  }
}

run("P5 · AI assistant", () => {
  let author: TestUser;
  let slug = "";
  let vendorId = "";

  beforeAll(async () => {
    const svc = serviceClient();
    author = await createUser("p5-author");
    const { data: city } = await svc.from("cities").select("id").eq("slug", "lagos").single();
    const { data: area } = await svc.from("areas").select("id").eq("city_id", city!.id).eq("slug", "lekki-phase-1").single();
    const { data: cat } = await svc.from("categories").select("id").eq("slug", "lounge").single();
    slug = `p5-lekki-lounge-${Date.now().toString(36)}`;
    const { data: v, error } = await svc
      .from("vendors")
      .insert({ slug, name: "Admiralty Test Lounge", category_id: cat!.id, city_id: city!.id, area_id: area!.id, location: "SRID=4326;POINT(3.4746 6.4474)", status: "published", price_band: "premium" })
      .select("id")
      .single();
    if (error) throw error;
    vendorId = v!.id;
    await svc.from("vendor_prices").insert({ vendor_id: vendorId, label: "Cocktail", amount_ngn: 9000 });
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      await svc.from("posts").insert({ author_id: author.id, vendor_id: vendorId, kind: "pulse", crowd_level: 5, status: "published", created_at: new Date(now - (i + 1) * 5 * 60_000).toISOString() });
    }
    await svc.rpc("admin_refresh_crowd_snapshots", {});
  }, 60_000);

  afterAll(async () => {
    await serviceClient().from("vendors").delete().eq("id", vendorId);
    await cleanup();
  });

  it("answers 'where is busy in Lekki now' with links to real venues from the live data", async () => {
    const r = await ask({ question: "Where is busy in Lekki now?", city: "lagos" }, { userId: author.id, ip: `p5-${randomUUID()}` });
    expect(r.mode).toBe("answer");
    expect(r.offered[slug]).toBe("Admiralty Test Lounge"); // the live Lekki venue is in the context
    const text = await readAll(r.stream);
    const linked = linkedVenues(text, r.offered);
    expect(linked, text).toContain(slug);
    // Nothing invented: every [[token]] the model wrote is an offered venue (or a safety link).
    expect(segmentAnswer(text, r.offered).filter((s) => s.type === "unknown"), text).toEqual([]);
  }, 60_000);

  it("refuses a road-safety question and links the city's safety page (no model call)", async () => {
    const r = await ask({ question: "Is the Lekki-Epe expressway safe to drive at night?", city: "lagos" }, { userId: author.id, ip: `p5-${randomUUID()}` });
    expect(r.mode).toBe("safety");
    const text = await readAll(r.stream);
    expect(segmentAnswer(text, {})).toContainEqual({ type: "safety", href: "/safety/lagos" });
    expect(text).toContain("112");
  });

  it("logs every question privately (outcome, venues linked) — not readable through the API", async () => {
    await new Promise((res) => setTimeout(res, 1500)); // onFinish logging is async
    const { data } = await serviceClient().rpc("admin_backup_rows", { p_schema: "private", p_table: "assistant_logs", p_offset: 0, p_limit: 5000 });
    const mine = ((data ?? []) as Array<{ profile_id: string; outcome: string; venues_linked: string[] }>).filter((r) => r.profile_id === author.id);
    expect(mine.map((r) => r.outcome).sort()).toEqual(["answered", "safety_redirect"]);
    expect(mine.find((r) => r.outcome === "answered")!.venues_linked).toContain(slug);
  });

  it("is limited to 20 questions per user per hour", async () => {
    const userId = randomUUID();
    for (let i = 0; i < 20; i++) await ask({ question: "is it safe to walk at night?" }, { userId, ip: null }).then((r) => readAll(r.stream));
    await expect(ask({ question: "is it safe to walk at night?" }, { userId, ip: null })).rejects.toThrow(/asked a lot/);
  }, 60_000);
});
