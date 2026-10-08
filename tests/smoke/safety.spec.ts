import { expect, test } from "@playwright/test";

import { admin, completeMfa, signIn } from "./fixtures";

const users: string[] = [];
test.afterAll(async () => {
  for (const id of users) await admin().auth.admin.deleteUser(id);
});

test("emergency numbers render per city with verification status", { tag: "@readonly" }, async ({ page }) => {
  await page.goto("/safety/lagos");
  await expect(page.getByTestId("emergency-banner")).toContainText("call 112");
  const blocks = page.getByTestId("safety-block");
  await expect(blocks.filter({ hasText: "National emergency number" })).toBeVisible();
  await expect(blocks.filter({ hasText: "LASEMA" })).toContainText("767");
  await expect(blocks.filter({ hasText: "LASEMA" }).getByRole("link", { name: "767" })).toHaveAttribute("href", "tel:767");
  await expect(blocks.first().getByTestId("last-verified")).toContainText("Last verified");

  await page.goto("/safety/abuja");
  await expect(page.getByTestId("safety-block").filter({ hasText: "National emergency number" })).toBeVisible();
  await expect(page.getByTestId("safety-block").filter({ hasText: "LASEMA" })).toHaveCount(0);
});

test("anonymous private report → exact confirmation → visible only in admin triage", async ({ page, browser }) => {
  const marker = `Smoke issue ${Date.now().toString(36)}: broken street lights near the junction`;
  await page.goto("/safety/lagos#report");
  await page.getByLabel("What is this about?").selectOption("infrastructure");
  await page.getByLabel("What happened?").fill(marker);
  await page.getByLabel("Your email").fill("smoke-reporter@example.com");
  await page.getByRole("button", { name: "Send privately" }).click();
  await expect(page.getByText("Thank you. Our team reviews every report. This is not an emergency service — if you are in danger call 112.")).toBeVisible();

  // Nowhere public.
  for (const path of ["/safety/lagos", "/", "/c/lagos", "/events"]) {
    await page.goto(path);
    await expect(page.getByText(marker)).toHaveCount(0);
  }

  const ctx = await browser.newContext();
  const adminPage = await ctx.newPage();
  const staff = await signIn(adminPage, "issues-admin", { role: "admin", next: "/admin/issues" });
  users.push(staff.id);
  await completeMfa(adminPage);
  await expect(adminPage.getByTestId("issue-report").filter({ hasText: marker })).toBeVisible();
  await ctx.close();
});

test("honeypot submissions are not stored", async ({ page }) => {
  const marker = `Honeypot ${Date.now().toString(36)} should not be stored`;
  await page.goto("/safety/abuja#report");
  await page.getByLabel("What is this about?").selectOption("scam");
  await page.getByLabel("What happened?").fill(marker);
  await page.getByLabel("Your email").fill("bot@example.com");
  await page.locator('input[name="website"]').fill("http://spam.example", { force: true });
  await page.getByRole("button", { name: "Send privately" }).click();
  await expect(page.getByText(/Our team reviews every report/)).toBeVisible();
  const { data } = await admin().rpc("admin_list_issue_reports", {});
  expect((data ?? []).some((r) => r.description === marker)).toBe(false);
});
