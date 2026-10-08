/** Stage P4 · itineraries: CMS save/publish, public read, totals. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { computeTotals } from "@/lib/itineraries/totals";
import { getPublishedItinerary, saveItinerary, setItineraryStatus } from "@/lib/services/itineraries";

import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv ? describe : describe.skip;
const meta = { ip: null, userAgent: "vitest" };

d("P4 · itineraries", () => {
  let adm: SessionContext;
  let vendor: { id: string; slug: string };
  const slug = `p4-test-${Date.now().toString(36)}`;
  let id = "";

  beforeAll(async () => {
    const a = await createUser("p4-admin");
    await serviceClient().from("profiles").update({ role: "admin" }).eq("id", a.id);
    adm = await sessionFor(a);
    vendor = await createPublishedVendor("p4");
  });
  afterAll(async () => {
    await serviceClient().from("itineraries").delete().eq("slug", slug);
    await cleanup();
  });

  const base = () => ({
    slug, title: "Two days in Lagos (test)", days: 2, excerpt: "Test", intro_md: "Hello",
    items: [
      { day: 1, time_label: "Evening", title: "Sundowners", vendor_slug: vendor.slug, cost_ngn: 15000 },
      { day: 1, title: "Suya", cost_ngn: 3500 },
      { day: 2, title: "Beach day", cost_ngn: 10000, cost_note: "Entry + loungers" },
      { day: 2, title: "Free walk" },
    ],
  });

  it("validates: stops must fit the day count, venue slugs must exist", async () => {
    await expect(saveItinerary(adm, { ...base(), days: 1 }, meta)).rejects.toBeInstanceOf(ZodError);
    await expect(saveItinerary(adm, { ...base(), items: [{ day: 1, title: "x stop", vendor_slug: "no-such-venue" }] }, meta)).rejects.toThrow(/Unknown venue slug/);
  });

  it("drafts are invisible publicly; publishing needs stops; once published anyone can read it in order", async () => {
    id = await saveItinerary(adm, base(), meta);
    expect(await getPublishedItinerary(slug)).toBeNull();
    expect((await anonClient().from("itinerary_items").select("id").eq("itinerary_id", id)).data).toEqual([]);
    await setItineraryStatus(adm, id, "published", meta);
    const it = await getPublishedItinerary(slug);
    expect(it!.items.map((s) => [s.day, s.title])).toEqual([[1, "Sundowners"], [1, "Suya"], [2, "Beach day"], [2, "Free walk"]]);
    expect(it!.items[0]!.vendor?.slug).toBe(vendor.slug);
    const { data: audit } = await serviceClient().rpc("admin_list_audit", { p_action_prefix: "itinerary.", p_entity_id: id, p_limit: 5 });
    expect(audit!.map((a) => a.action)).toEqual(expect.arrayContaining(["itinerary.created", "itinerary.published"]));
  });

  it("totals are correct for the saved stops", async () => {
    const it = await getPublishedItinerary(slug);
    const t = computeTotals(it!.items, it!.days);
    expect(t.days.map((x) => [x.subtotal, x.runningTotal])).toEqual([[18500, 18500], [10000, 28500]]);
    expect([t.total, t.unpriced]).toEqual([28500, 1]);
  });

  it("API roles can't write itineraries", async () => {
    const u = await createUser("p4-user");
    const res = await u.client.from("itineraries").insert({ slug: "hack", title: "hack" } as never);
    expect(res.error).not.toBeNull();
  });
});
