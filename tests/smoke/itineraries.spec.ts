import { expect, test } from "@playwright/test";

import { admin, completeMfa, signIn } from "./fixtures";

const users: string[] = [];
const slug = `smoke-itinerary-${Date.now().toString(36)}`;

test.afterAll(async () => {
  await admin().from("itineraries").delete().eq("slug", slug);
  for (const id of users) await admin().auth.admin.deleteUser(id);
});

test("admin builds an itinerary in the CMS → published page shows day tabs, correct running totals and a working ₦/£/$ toggle", async ({ page, browser }) => {
  const { data: fx } = await admin().from("platform_settings").select("fx_gbp_per_ngn, fx_usd_per_ngn").eq("id", 1).single();
  test.skip(!fx?.fx_gbp_per_ngn || !fx?.fx_usd_per_ngn, "FX rates not set on this database (npm run db:samples)");

  const adm = await signIn(page, "itin-admin", { role: "admin", next: "/admin/itineraries/new" });
  users.push(adm.id);
  await completeMfa(page);
  await expect(page.getByTestId("itinerary-editor")).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill("Smoke: two days out");
  await page.getByLabel("Slug", { exact: true }).fill(slug);
  await page.getByLabel("Days", { exact: true }).fill("2");
  const stop = (i: number) => page.getByTestId("editor-stop").nth(i);
  await stop(0).getByLabel("Stop 1 title", { exact: true }).fill("Sundowners");
  await stop(0).getByLabel("Stop 1 cost", { exact: true }).fill("15000");
  await page.getByRole("button", { name: "Add stop" }).click();
  await stop(1).getByLabel("Stop 2 day", { exact: true }).fill("2");
  await stop(1).getByLabel("Stop 2 title", { exact: true }).fill("Beach day");
  await stop(1).getByLabel("Stop 2 cost", { exact: true }).fill("10000");
  await expect(page.getByTestId("editor-totals")).toContainText("Trip total: ₦25,000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/admin\/itineraries\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Published.")).toBeVisible();

  const ctx = await browser.newContext();
  const v = await ctx.newPage();
  await v.goto(`/itineraries/${slug}`);
  await expect(v.getByRole("heading", { level: 1, name: "Smoke: two days out" })).toBeVisible();
  await expect(v.getByTestId("day-subtotal")).toHaveText("₦15,000");
  await v.getByTestId("day-tab-2").click();
  await expect(v.getByTestId("itinerary-stop")).toContainText("Beach day");
  await expect(v.getByTestId("day-subtotal")).toHaveText("₦10,000");
  await expect(v.getByTestId("running-total")).toHaveText("₦25,000");
  const gbp = Math.round(25000 * Number(fx!.fx_gbp_per_ngn));
  const usd = Math.round(25000 * Number(fx!.fx_usd_per_ngn));
  await v.getByTestId("currency-toggle").getByRole("radio", { name: /Pounds/ }).click();
  await expect(v.getByTestId("running-total")).toHaveText(`£${gbp}`);
  await v.getByTestId("currency-toggle").getByRole("radio", { name: /Dollars/ }).click();
  await expect(v.getByTestId("trip-total")).toHaveText(`$${usd}`);
  const ld = await v.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld!)[0]["@type"]).toBe("TouristTrip");
  await ctx.close();
});
