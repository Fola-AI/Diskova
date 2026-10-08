/** Stage L9: December-season trigger (Africa/Lagos dates), submission + approval flow, RLS on events. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { decideEvent } from "@/lib/services/admin/events";
import { submitEvent } from "@/lib/services/events";

import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv ? describe : describe.skip;
const staffMeta = { ip: null, userAgent: "vitest" };

d("L9 · events", () => {
  let user: TestUser;
  let adminUser: TestUser;
  let cityId: string;
  let vendorId: string;
  const created: string[] = [];
  let originalSeason: { december_season_start: string | null; december_season_end: string | null };

  async function insertEvent(startsAt: string, title = "Season test") {
    const { data, error } = await serviceClient()
      .from("events")
      .insert({ slug: `l9-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, title, city_id: cityId, starts_at: startsAt, status: "published", venue_name_freeform: "Test venue" })
      .select("id, is_december_season")
      .single();
    if (error) throw error;
    created.push(data.id);
    return data;
  }

  beforeAll(async () => {
    [user, adminUser] = await Promise.all([createUser("l9-user"), createUser("l9-admin")]);
    await serviceClient().from("profiles").update({ role: "admin" }).eq("id", adminUser.id);
    const { data: city } = await serviceClient().from("cities").select("id").eq("slug", "lagos").single();
    cityId = city!.id;
    vendorId = (await createPublishedVendor("l9")).id;
    const { data: s } = await serviceClient().from("platform_settings").select("december_season_start, december_season_end").eq("id", 1).single();
    originalSeason = s!;
    await serviceClient().from("platform_settings").update({ december_season_start: "2026-11-15", december_season_end: "2027-01-10" }).eq("id", 1);
  });

  afterAll(async () => {
    await serviceClient().from("platform_settings").update(originalSeason).eq("id", 1);
    if (created.length) await serviceClient().from("events").delete().in("id", created);
    await cleanup();
  });

  it("flags events by their Lagos-local start date (15 Nov – 10 Jan inclusive)", async () => {
    expect((await insertEvent("2026-11-14T22:30:00Z")).is_december_season).toBe(false); // 14 Nov 23:30 WAT
    expect((await insertEvent("2026-11-14T23:30:00Z")).is_december_season).toBe(true); //  15 Nov 00:30 WAT
    expect((await insertEvent("2027-01-10T22:00:00Z")).is_december_season).toBe(true); //  10 Jan 23:00 WAT
    expect((await insertEvent("2027-01-10T23:30:00Z")).is_december_season).toBe(false); // 11 Jan 00:30 WAT
  });

  it("re-flags when an event moves and when the season dates change", async () => {
    const e = await insertEvent("2026-10-20T19:00:00Z");
    expect(e.is_december_season).toBe(false);
    const { data: moved } = await serviceClient().from("events").update({ starts_at: "2026-12-24T19:00:00Z" }).eq("id", e.id).select("is_december_season").single();
    expect(moved?.is_december_season).toBe(true);

    const upd = await serviceClient().from("platform_settings").update({ december_season_start: "2026-12-26", december_season_end: "2027-01-10" }).eq("id", 1).select("december_season_start");
    expect(upd.error).toBeNull();
    expect(upd.data?.[0]?.december_season_start).toBe("2026-12-26");
    const { data: after } = await serviceClient().from("events").select("is_december_season").eq("id", e.id).single();
    expect(after?.is_december_season).toBe(false);
    await serviceClient().from("platform_settings").update({ december_season_start: "2026-11-15", december_season_end: "2027-01-10" }).eq("id", 1);
    const { data: back } = await serviceClient().from("events").select("is_december_season").eq("id", e.id).single();
    expect(back?.is_december_season).toBe(true);
  });

  it("a submitted event is pending, invisible to the public, and published only by an admin (audited)", async () => {
    const res = await submitEvent(await sessionFor(user), {
      title: "Smoke Rooftop Night",
      city_id: cityId,
      venue_vendor_id: vendorId,
      starts_local: "2026-12-19T21:00",
      category: "party",
      ticket_url: "tickets.example.com/x",
      price_from_ngn: "10,000",
    });
    const { data: row } = await serviceClient().from("events").select("id, status, starts_at, ticket_url, is_december_season, location").eq("slug", res.slug).single();
    created.push(row!.id);
    expect(row).toMatchObject({ status: "pending_review", ticket_url: "https://tickets.example.com/x", is_december_season: true });
    expect(new Date(row!.starts_at).toISOString()).toBe("2026-12-19T20:00:00.000Z"); // 21:00 WAT
    expect(row!.location).not.toBeNull(); // copied from the venue
    expect((await anonClient().from("events").select("id").eq("id", row!.id)).data).toEqual([]);

    // The submitter can't publish it themselves.
    const self = await user.client.from("events").update({ status: "published" }).eq("id", row!.id);
    expect(self.error).not.toBeNull();

    await expect(decideEvent(await sessionFor(adminUser), row!.id, "reject", null, staffMeta)).rejects.toThrow(/reason/i);
    await decideEvent(await sessionFor(adminUser), row!.id, "approve", null, staffMeta);
    expect((await anonClient().from("events").select("status").eq("id", row!.id).single()).data?.status).toBe("published");
    const { data: audit } = await serviceClient().rpc("admin_list_audit", { p_entity_id: row!.id, p_action_prefix: "event." });
    expect(audit?.[0]).toMatchObject({ action: "event.approve", actor_id: adminUser.id });
  });

  it("only members can post an event as a venue", async () => {
    await expect(
      submitEvent(await sessionFor(user), { title: "Not my venue", city_id: cityId, vendor_id: vendorId, venue_vendor_id: vendorId, starts_local: "2026-12-01T20:00", category: "party" }),
    ).rejects.toThrow(/only submit events for venues you manage/);
  });

  it("refuses an event whose text is auto-blocked", async () => {
    const phrase = `blockme${Date.now().toString(36)}`;
    await serviceClient().from("platform_settings").update({ blocklist_phrases: [phrase] }).eq("id", 1);
    try {
      await expect(
        submitEvent(await sessionFor(user), { title: `Party ${phrase}`, city_id: cityId, venue_name_freeform: "Somewhere", starts_local: "2026-12-02T20:00", category: "party" }),
      ).rejects.toThrow(/can't be submitted/);
    } finally {
      await serviceClient().from("platform_settings").update({ blocklist_phrases: [] }).eq("id", 1);
    }
  });
});
