import { expect, test, type Page } from "@playwright/test";

async function jsonLd(page: Page): Promise<Array<Record<string, unknown>>> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((b) => {
    const j = JSON.parse(b) as Record<string, unknown> | Array<Record<string, unknown>>;
    return Array.isArray(j) ? j : [j];
  });
}

test("robots.txt blocks private areas and points at the sitemap", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  for (const p of ["/admin", "/me", "/vendor", "/api/", "/preview/"]) expect(txt).toContain(`Disallow: ${p}`);
  expect(txt).toMatch(/Sitemap: .+\/sitemap\.xml/);
});

test("sitemap lists cities, venues, guides and safety pages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/c/lagos", "/v/", "/guides/lagos", "/safety/lagos", "/events/december"]) expect(xml).toContain(p);
});

test("home: canonical + WebSite search action + Organization", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\/[^/]+\/?$/);
  const types = (await jsonLd(page)).map((j) => j["@type"]);
  expect(types).toEqual(expect.arrayContaining(["WebSite", "Organization"]));
});

test("venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings", async ({ page }) => {
  await page.goto("/c/lagos");
  const href = await page.getByTestId("vendor-grid").locator("a[href^='/v/']").first().getAttribute("href");
  await page.goto(href!);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${href}$`));
  const ld = await jsonLd(page);
  const venue = ld.find((j) => j["@type"] !== "BreadcrumbList")!;
  expect(String(venue["@type"])).not.toBe("");
  expect(venue.address).toMatchObject({ addressCountry: "NG" });
  expect(ld.some((j) => j["@type"] === "BreadcrumbList")).toBe(true);
  expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|"review"/);
});
