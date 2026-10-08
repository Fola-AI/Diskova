import { expect, test } from "@playwright/test";

import { admin, signIn } from "./fixtures";

/**
 * Stage L7 acceptance (browser side): Tonight view empty state, live rail + crowd badge from a real
 * snapshot, /api/live/[city], heat map renders on toggle, forecast line on the venue page.
 * Weighting + < 2 s performance are covered by tests/rls/l7-crowd.test.ts and npm run bench:snapshots.
 */
test.describe.configure({ mode: "serial" });

const users: string[] = [];
let vendor: { id: string; slug: string; name: string };

test.beforeAll(async () => {
  const a = admin();
  const { data: city } = await a.from("cities").select("id").eq("slug", "ibadan").single();
  const { data: cat } = await a.from("categories").select("id").eq("slug", "lounge").single();
  const slug = `smoke-tonight-${Date.now().toString(36)}`;
  const { data } = await a
    .from("vendors")
    .insert({ slug, name: `Tonight Smoke ${slug.slice(-5)}`, category_id: cat!.id, city_id: city!.id, location: "SRID=4326;POINT(3.915 7.43)", status: "published" })
    .select("id, slug, name")
    .single();
  vendor = data!;
  // Forecast rows exist before the venue page is first rendered (it's ISR-cached for 60 s).
  const weekday = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" })).getDay();
  await a.from("crowd_forecast").insert([
    { vendor_id: vendor.id, weekday, hour: 23, crowd_level_expected: 4.2, sample_size: 6 },
    { vendor_id: vendor.id, weekday, hour: 20, crowd_level_expected: 2.1, sample_size: 6 },
    { vendor_id: vendor.id, weekday, hour: 1, crowd_level_expected: 4.9, sample_size: 2 }, // too few samples: ignored
  ]);
});

test.afterAll(async () => {
  const a = admin();
  await a.from("vendors").delete().eq("id", vendor.id);
  for (const id of users) await a.auth.admin.deleteUser(id);
});

test("empty Tonight view invites the first pulse and vendor updates", async ({ page }) => {
  await page.goto("/c/aba");
  await expect(page.getByRole("heading", { level: 1, name: "Tonight in Aba" })).toBeVisible();
  const empty = page.getByTestId("live-empty");
  await expect(empty).toContainText("Be the first");
  await expect(empty.getByRole("link", { name: /Vendors: post an official update/ })).toHaveAttribute("href", "/vendor");
});

test("a pulse becomes a live venue: rail, hero count, polling API and crowd badge", async ({ page, request }) => {
  const user = await signIn(page, "tonight-pulser", { next: `/v/${vendor.slug}` });
  users.push(user.id);
  await page.getByRole("button", { name: "Pulse: Packed" }).click();
  await expect(page.getByText(/Thanks/)).toBeVisible();

  // The snapshot job runs every 5 minutes; trigger it now instead of waiting.
  const { error } = await admin().rpc("admin_refresh_crowd_snapshots", {});
  expect(error).toBeNull();

  const api = await request.get(`/api/live/ibadan?t=${Date.now()}`);
  expect(api.status()).toBe(200);
  expect(api.headers()["cache-control"]).toContain("s-maxage=30");
  const body = (await api.json()) as { live: Array<{ slug: string; crowd_level_avg: number; confidence: string; weight: number }> };
  const mine = body.live.find((l) => l.slug === vendor.slug);
  expect(mine).toMatchObject({ crowd_level_avg: 4, confidence: "low" });
  expect(mine!.weight).toBeGreaterThan(0);

  await page.goto("/c/ibadan");
  const card = page.getByTestId("live-card").filter({ hasText: vendor.name });
  await expect(card).toBeVisible();
  await expect(card.getByText("Packed")).toBeVisible();
  await expect(page.getByTestId("hero-live-count")).toContainText("live right now");

  await page.goto(`/v/${vendor.slug}`);
  await expect(page.getByTestId("vendor-crowd")).toContainText("Packed");
});

test("heat map renders on toggle", async ({ page }) => {
  await page.goto("/c/ibadan");
  await page.getByTestId("map-toggle").first().click();
  await expect(page.locator("[data-heat=on] .mapboxgl-canvas")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("heat-ready")).toBeAttached({ timeout: 20_000 });
});

test("forecast line shows once there are 4+ weeks of data", async ({ page }) => {
  await page.goto(`/v/${vendor.slug}`);
  await expect(page.getByTestId("forecast-line")).toHaveText(/Usually packed around 11pm on \w+days/);
});
