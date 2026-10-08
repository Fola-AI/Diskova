import { expect, test } from "@playwright/test";

import { admin, completeMfa, signIn } from "./fixtures";

/**
 * Stage L10 acceptance: paste markdown → live preview → publish → page renders (with custom tags,
 * Last updated) → in sitemap → valid JSON-LD. Also: draft preview link and that drafts are not public.
 */
test.describe.configure({ mode: "serial" });
const users: string[] = [];
const slug = `smoke-guide-${Date.now().toString(36)}`;

test.afterAll(async () => {
  const a = admin();
  await a.from("guides").delete().eq("slug", slug);
  for (const id of users) await a.auth.admin.deleteUser(id);
});

const MARKDOWN = `## Getting started

Lagos nights start late — most clubs fill up **after midnight**. Read our [guidelines](/guidelines).

<Callout type="tip">
Carry some cash: not every bar takes cards.
</Callout>

<VendorCard slug="afrobeat-junction-lagos" />

<PriceTable vendor="afrobeat-junction-lagos" />

- Book a ride before you leave
- Check the dress code

<script>alert("x")</script>`;

test("paste markdown → preview → publish → live page, sitemap and valid JSON-LD", async ({ page, request }) => {
  const staff = await signIn(page, "cms-admin", { role: "admin", next: "/admin/content/new" });
  users.push(staff.id);
  await completeMfa(page);
  await expect(page).toHaveURL(/\/admin\/content\/new$/);

  await page.getByLabel("Title", { exact: true }).fill("Smoke test: Lagos nightlife basics");
  await page.getByLabel("Slug", { exact: true }).fill(slug);
  await page.getByLabel("Type", { exact: true }).selectOption("city_guide");
  await page.getByLabel("City", { exact: true }).selectOption({ label: "Lagos" });
  await page.getByLabel("Excerpt", { exact: true }).fill("What to know before a night out in Lagos.");
  await page.getByLabel("Body (markdown)").fill(MARKDOWN);
  await page.getByLabel("Tags (comma separated)").fill("nightlife, lagos");

  // Live preview renders as you type; raw HTML is escaped, never executed.
  const preview = page.getByTestId("cms-preview");
  await expect(preview.getByRole("heading", { name: "Getting started" })).toBeVisible();
  await expect(preview.getByText("Venue card: afrobeat-junction-lagos")).toBeVisible();
  await expect(preview).toContainText('<script>alert("x")</script>');
  expect(await preview.locator("script").count()).toBe(0);

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]{36}$/);
  await expect(page.getByTestId("guide-status")).toHaveText("draft");

  // Drafts are not public…
  expect((await request.get(`/guides/lagos/${slug}`)).status()).toBe(404);
  // …but the signed draft preview works.
  const previewHref = await page.getByRole("link", { name: "Draft preview" }).getAttribute("href");
  expect((await request.get(previewHref!)).status()).toBe(200);
  expect((await request.get(previewHref!.replace(/token=[^&]+/, "token=forged"))).status()).toBe(404);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByTestId("guide-status")).toHaveText("published", { timeout: 15_000 });

  await page.goto(`/guides/lagos/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Smoke test: Lagos nightlife basics");
  await expect(page.getByTestId("last-updated")).toContainText("Last updated");
  await expect(page.getByTestId("callout")).toContainText("Carry some cash");
  await expect(page.getByTestId("embed-vendor")).toContainText("Afrobeat Junction");
  await expect(page.getByTestId("embed-prices")).toContainText("₦10,000");
  expect(await page.getByTestId("guide-body").locator("script").count()).toBe(0);

  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  expect(ld).toMatchObject({ "@context": "https://schema.org", "@type": "Article", headline: "Smoke test: Lagos nightlife basics" });
  expect(new Date(ld.datePublished).toString()).not.toBe("Invalid Date");
  expect(new Date(ld.dateModified).toString()).not.toBe("Invalid Date");
  expect(ld.publisher["@type"]).toBe("Organization");
  expect(ld.mainEntityOfPage["@id"]).toMatch(new RegExp(`/guides/lagos/${slug}$`));
  expect(ld.about).toEqual(expect.arrayContaining([expect.objectContaining({ "@type": "TouristAttraction", url: expect.stringMatching(/\/v\/afrobeat-junction-lagos$/) })]));

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/guides/lagos/${slug}`);

  // The city hub lists it under the matching tab.
  await page.goto("/guides/lagos?tab=nightlife");
  await expect(page.getByTestId("guide-card").filter({ hasText: "Lagos nightlife basics" }).first()).toBeVisible();
});

test("toolkit index and guides index render", async ({ page }) => {
  expect((await page.goto("/toolkit"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: /Diaspora toolkit/ })).toBeVisible();
  expect((await page.goto("/guides"))?.status()).toBe(200);
  expect((await page.goto("/blog"))?.status()).toBe(200);
});
