import { expect, test } from "@playwright/test";

import { admin, signIn } from "./fixtures";

const created: string[] = [];
test.afterAll(async () => {
  for (const id of created) await admin().auth.admin.deleteUser(id);
});

test("visitors are asked to sign in before saving to a list", async ({ page }) => {
  await page.goto("/c/lagos");
  await page.getByTestId("vendor-grid").getByTestId("add-to-night").first().click();
  await expect(page).toHaveURL(/\/login\?next=%2Fc%2Flagos/);
});

test("plan my night: add from a venue → make public → share link renders logged-out (map, cost, WhatsApp, OG)", async ({ page, browser }) => {
  const u = await signIn(page, "lists", { next: "/c/lagos" });
  created.push(u.id);
  const card = page.getByTestId("vendor-grid").locator("li").first();
  const venueName = (await card.locator("h3").textContent())!.trim();
  await card.getByTestId("add-to-night").click();
  const sheet = page.getByTestId("add-to-night-sheet");
  await sheet.getByLabel("New list name").fill("Smoke night out");
  await sheet.getByRole("button", { name: "Create" }).click();
  await expect(sheet.getByRole("button", { name: /Smoke night out/ })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/me/lists");
  await page.getByTestId("my-lists").getByRole("link", { name: /Smoke night out/ }).click();
  await expect(page.getByTestId("list-items")).toContainText(venueName);
  await page.getByTestId("list-public-toggle").check();
  await expect(page.getByText("Link is live")).toBeVisible(); // saved server-side
  const shareUrl = (await page.getByTestId("list-share-url").textContent())!.trim();
  const path = new URL(shareUrl).pathname;
  expect(path).toMatch(/^\/l\/[A-Za-z0-9_-]{12}$/);

  const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const anonPage = await anon.newPage();
  const res = await anonPage.goto(path);
  expect(res?.status()).toBe(200);
  await expect(anonPage.getByRole("heading", { level: 1, name: "Smoke night out" })).toBeVisible();
  await expect(anonPage.getByTestId("shared-item")).toContainText(venueName);
  await expect(anonPage.getByTestId("cost-estimate")).toBeVisible();
  await expect(anonPage.getByRole("link", { name: "Share on WhatsApp" })).toHaveAttribute("href", /wa\.me|whatsapp/);
  await expect(anonPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const ogUrl = await anonPage.locator('meta[property="og:image"]').first().getAttribute("content");
  const og = await anonPage.request.get(new URL(ogUrl!).pathname + new URL(ogUrl!).search);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  await anon.close();

  // Private again → the link stops working.
  await page.getByTestId("list-public-toggle").uncheck();
  await expect(page.getByText("List is private")).toBeVisible();
  await expect(page.getByTestId("list-share-url")).toHaveCount(0);
  const anon2 = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  expect((await (await anon2.newPage()).goto(path))?.status()).toBe(404);
  await anon2.close();
});
