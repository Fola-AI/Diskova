import { expect, test } from "@playwright/test";

import { admin, completeMfa, signIn } from "./fixtures";

/**
 * Stage L9 acceptance (browser): 200 events render smoothly; /events/december countdown; event page
 * (venue card, external ticket link, share, valid .ics); submit → admin approve → public.
 * Season trigger correctness: tests/rls/l9-events.test.ts. iCal validity: tests/unit/ical.test.ts.
 */
test.describe.configure({ mode: "serial" });

const users: string[] = [];
const eventIds: string[] = [];
let cityId = "";
let featuredSlug = "";
let venue: { id: string; slug: string; name: string };

test.beforeAll(async () => {
  const a = admin();
  const { data: city } = await a.from("cities").select("id").eq("slug", "owerri").single();
  cityId = city!.id;
  const { data: v } = await a.from("vendors").select("id, slug, name").eq("city_id", cityId).eq("status", "published").limit(1).single();
  venue = v!;
  const base = Date.now() + 86_400_000;
  const rows = Array.from({ length: 200 }, (_, i) => ({
    slug: `smoke-ev-${base.toString(36)}-${i}`,
    title: `Smoke Event ${String(i + 1).padStart(3, "0")}`,
    city_id: cityId,
    venue_vendor_id: i % 3 === 0 ? venue.id : null,
    venue_name_freeform: i % 3 === 0 ? null : `Venue ${i}`,
    starts_at: new Date(base + Math.floor(i / 4) * 86_400_000 + (i % 4) * 3 * 3600_000).toISOString(),
    category: (["party", "concert", "comedy", "beach_party"] as const)[i % 4],
    status: "published" as const,
    is_featured: i === 0,
    ticket_url: i === 0 ? "https://tickets.example.com/smoke" : null,
    price_from_ngn: i % 2 ? 5000 : null,
    is_free: i % 2 === 0,
  }));
  const { data, error } = await a.from("events").insert(rows).select("id, slug");
  if (error) throw error;
  eventIds.push(...data.map((d) => d.id));
  featuredSlug = data[0].slug;
});

test.afterAll(async () => {
  const a = admin();
  for (let i = 0; i < eventIds.length; i += 100) await a.from("events").delete().in("id", eventIds.slice(i, i + 100));
  for (const id of users) await a.auth.admin.deleteUser(id);
});

test("200 events render smoothly in the list and month views", async ({ page }) => {
  const started = Date.now();
  const res = await page.goto("/events?city=owerri");
  expect(res?.status()).toBe(200);
  const cards = page.getByTestId("event-card").filter({ hasText: "Smoke Event" });
  await expect(cards).toHaveCount(200);
  const loadMs = Date.now() - started;
  expect(loadMs).toBeLessThan(5_000);
  // Long-list rendering cost is bounded by content-visibility; scrolling to the end must stay responsive.
  const scrollMs = await page.evaluate(async () => {
    const t = performance.now();
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t;
  });
  expect(scrollMs).toBeLessThan(500);
  test.info().annotations.push({ type: "events-200-load-ms", description: String(loadMs) }, { type: "scroll-ms", description: String(Math.round(scrollMs)) });

  await page.goto("/events?city=owerri&view=month");
  await expect(page.getByTestId("month-grid")).toBeVisible();
});

test("December in Nigeria page shows the countdown before the season", async ({ page }) => {
  await page.goto("/events/december");
  await expect(page.getByRole("heading", { level: 1, name: "December in Nigeria" })).toBeVisible();
  await expect(page.getByTestId("countdown")).toContainText("days");
});

test("event page: venue card, external ticket link, share, valid .ics", async ({ page, request }) => {
  await page.goto(`/events/${featuredSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Smoke Event 001");
  await expect(page.getByTestId("venue-card")).toContainText(venue.name);
  const tickets = page.getByRole("link", { name: /Tickets/ });
  await expect(tickets).toHaveAttribute("href", "https://tickets.example.com/smoke");
  await expect(tickets).toHaveAttribute("rel", /nofollow noopener/);
  await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toBeVisible();

  const ics = await request.get(`/events/${featuredSlug}/ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = await ics.text();
  expect(body.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
  expect(body).toMatch(/BEGIN:VEVENT\r\nUID:[^\r]+\r\nDTSTAMP:\d{8}T\d{6}Z\r\nDTSTART:\d{8}T\d{6}Z/);
  expect(body.trimEnd().endsWith("END:VCALENDAR")).toBe(true);

  const feed = await request.get("/events/calendar.ics?city=owerri");
  expect((await feed.text()).match(/BEGIN:VEVENT/g)?.length).toBeGreaterThanOrEqual(200);
});

test("submit an event → admin approves → it is public", async ({ browser }) => {
  const userCtx = await browser.newContext();
  const page = await userCtx.newPage();
  const u = await signIn(page, "event-submitter", { next: "/events/submit" });
  users.push(u.id);
  const title = `Submitted Smoke Night ${Date.now().toString(36)}`;
  await page.getByLabel("Event name").fill(title);
  await page.getByLabel("City").selectOption({ label: "Owerri" });
  await page.getByLabel("Venue name").fill("Smoke Garden");
  await page.getByLabel("Starts (Lagos time)").fill("2026-12-27T20:00");
  await page.getByLabel("Free entry").check();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText(/your event is in review/i)).toBeVisible();
  const { data: ev } = await admin().from("events").select("id, slug, status, is_december_season").eq("title", title).single();
  eventIds.push(ev!.id);
  expect(ev).toMatchObject({ status: "pending_review", is_december_season: true });
  expect((await page.goto(`/events/${ev!.slug}`))?.status()).toBe(404);
  await userCtx.close();

  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  const staff = await signIn(adminPage, "event-admin", { role: "admin", next: "/admin/events" });
  users.push(staff.id);
  await completeMfa(adminPage);
  const card = adminPage.getByTestId("pending-event").filter({ hasText: title });
  await card.getByRole("button", { name: "Approve" }).click();
  await expect.poll(async () => (await admin().from("events").select("status").eq("id", ev!.id).single()).data?.status, { timeout: 15_000 }).toBe("published");
  // The action finishes (incl. revalidating the event page's cached 404) before the queue re-renders.
  await expect(adminPage.getByTestId("pending-event").filter({ hasText: title })).toHaveCount(0, { timeout: 15_000 });
  await adminCtx.close();

  const anonCtx = await browser.newContext();
  const anon = await anonCtx.newPage();
  expect((await anon.goto(`/events/${ev!.slug}`))?.status()).toBe(200);
  await anonCtx.close();
});
