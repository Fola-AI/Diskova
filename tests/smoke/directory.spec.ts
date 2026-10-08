import { expect, test } from "@playwright/test";

/**
 * Stage L4 acceptance: seed vendors render; filters work; vendor page (§8.2 minus feed/pulse);
 * map loads only on toggle; share + deep links; search; sitemap; OG image.
 * Relies on DEV sample content (npm run db:samples) — fictional vendors only.
 */

test("city directory lists published seed vendors with open-now status", async ({ page }) => {
  await page.goto("/c/lagos");
  await expect(page.getByRole("heading", { level: 1, name: "Lagos" })).toBeVisible();
  // ≥ 10: the 10 Lagos sample vendors (other smoke tests may add their own venues in parallel).
  const cards = page.getByTestId("vendor-grid").locator("li");
  expect(await cards.count()).toBeGreaterThanOrEqual(10);
  await expect(page.getByText("Afrobeat Junction")).toBeVisible();
  await expect(page.locator("text=/Open · closes|Closed · opens/").first()).toBeVisible();
});

test("category chip, area and price filters narrow the list", async ({ page }) => {
  await page.goto("/c/lagos");
  const grid = page.getByTestId("vendor-grid");
  await page.goto("/c/lagos");
  const total = await grid.locator("li").count();

  await page.getByRole("link", { name: /^Nightclub/ }).click();
  await expect(page).toHaveURL(/category=nightclub/);
  await expect(grid).toContainText("Afrobeat Junction");
  await expect(grid).not.toContainText("Suya Street Corner");

  await page.goto("/c/lagos?area=ikoyi");
  await expect(grid).toContainText("Copper Lantern Rooftop");
  await expect(grid).toContainText("Ochre Wall Gallery");
  await expect(grid).not.toContainText("Afrobeat Junction");

  await page.goto("/c/lagos?price=budget&feature=late_night");
  await expect(grid).toContainText("Suya Street Corner");
  await expect(grid).not.toContainText("Palmwine & Pepper"); // budget, but not open late

  // Unknown values are ignored, not errors.
  const res = await page.goto("/c/lagos?price=cheap&area=%3Cscript%3E");
  expect(res?.status()).toBe(200);
  expect(await grid.locator("li").count()).toBe(total);
});

test("unknown city and unpublished vendor return 404", async ({ page }) => {
  expect((await page.goto("/c/atlantis"))?.status()).toBe(404);
  expect((await page.goto("/v/does-not-exist"))?.status()).toBe(404);
});

test("map loads only when toggled", async ({ page }) => {
  const glRequests: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    // GL map assets: style JSON, vector tiles, fonts, sprites, telemetry (not the static preview image)
    if (/api\.mapbox\.com\/(v4|fonts|styles\/v1\/mapbox\/dark-v11\?|styles\/v1\/mapbox\/dark-v11\/sprite)|events\.mapbox\.com|tiles\.mapbox\.com/.test(url)) {
      glRequests.push(url);
    }
  });
  await page.goto("/v/afrobeat-junction-lagos");
  await page.waitForLoadState("networkidle");
  expect(glRequests).toEqual([]);
  expect(await page.evaluate(() => document.querySelector(".mapboxgl-map"))).toBeNull();

  await page.getByTestId("map-toggle").click();
  await expect(page.getByTestId("map-container")).toBeVisible();
  await expect(page.locator(".mapboxgl-map")).toBeAttached({ timeout: 15_000 });
  await expect.poll(() => glRequests.length, { timeout: 15_000 }).toBeGreaterThan(0);
});

test("vendor page: header, prices, hours, deep links and share", async ({ page }) => {
  await page.goto("/v/afrobeat-junction-lagos");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Afrobeat Junction");
  await expect(page.getByText("₦10,000")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Opening hours" })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Get there and contact" });
  const uber = await nav.getByRole("link", { name: "Uber" }).getAttribute("href");
  expect(uber).toMatch(/^https:\/\/m\.uber\.com\/ul\/\?action=setPickup.*dropoff%5Blatitude%5D=6\.\d+/);
  const bolt = await nav.getByRole("link", { name: "Bolt" }).getAttribute("href");
  expect(bolt).toMatch(/^https:\/\/bolt\.eu\/en\/rides\/\?dropoff_lat=6\.\d+&dropoff_lng=3\.\d+$/);
  await expect(nav.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/234\d{10}\?text=/);
  for (const link of await nav.getByRole("link").all()) {
    await expect(link).toHaveAttribute("rel", /nofollow/);
    await expect(link).toHaveAttribute("rel", /noopener/);
  }

  await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/\?text=.*%2Fv%2Fafrobeat-junction-lagos/,
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
});

test("search finds venues by partial name, with typeahead", async ({ page }) => {
  await page.goto("/search?q=afrobeat");
  await expect(page.getByTestId("search-results")).toContainText("Afrobeat Junction");

  await page.goto("/search");
  await page.getByLabel("Search places, events and guides").fill("copper");
  await expect(page.getByRole("option").first()).toContainText("Copper Lantern Rooftop");
});

test("sitemap lists cities and vendors; OG image renders", async ({ request, page }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/c/lagos");
  expect(sitemap).toContain("/v/afrobeat-junction-lagos");

  await page.goto("/v/afrobeat-junction-lagos");
  const ogUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogUrl).toMatch(/\/v\/afrobeat-junction-lagos\/opengraph-image/);
  const og = await request.get(new URL(ogUrl!).pathname + new URL(ogUrl!).search);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});
