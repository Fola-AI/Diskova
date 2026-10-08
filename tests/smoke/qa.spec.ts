import { expect, test } from "@playwright/test";

import { admin, completeMfa, signIn } from "./fixtures";

const users: string[] = [];
const marker = `Smoke QA ${Date.now().toString(36)}`;

test.afterAll(async () => {
  const a = admin();
  await a.from("qa_questions").delete().like("title", `${marker}%`);
  for (const id of users) await a.auth.admin.deleteUser(id);
});

test("admin writes a pinned seed in /admin/qa → it renders first on the city Q&A page, logged-out, with its official answer", async ({ page, browser }) => {
  const adm = await signIn(page, "qa-admin", { role: "admin", next: "/admin/qa" });
  users.push(adm.id);
  await completeMfa(page);
  await expect(page).toHaveURL(/\/admin\/qa$/);
  await page.getByText("New pinned question (seed)").click();
  const form = page.getByTestId("qa-seed-form");
  await form.getByLabel("City").selectOption({ label: "Lagos" });
  await form.getByLabel("Question").fill(`${marker}: pinned — how do I get around at night?`);
  await form.getByLabel("Official answer").fill("Use ride-hailing and share your trip with a friend.");
  await form.getByRole("button", { name: "Create pinned question" }).click();
  await expect(form.getByText("Pinned question created.")).toBeVisible();

  const anon = await browser.newContext();
  const visitor = await anon.newPage();
  await visitor.goto("/c/lagos");
  await visitor.getByTestId("city-qa-link").click();
  await expect(visitor).toHaveURL(/\/c\/lagos\/questions$/);
  const first = visitor.getByTestId("qa-question").first();
  await expect(first).toContainText(marker);
  await expect(first.getByTestId("qa-pinned")).toBeVisible();
  await expect(first.getByTestId("qa-answer").first()).toContainText("Official");
  await anon.close();
});

test("ask on a venue page → moderated → visible; it shows up in /admin/qa", async ({ page, browser }) => {
  const u = await signIn(page, "qa-asker", { next: "/c/lagos" });
  users.push(u.id);
  await page.getByTestId("vendor-grid").locator("a[href^='/v/']").first().click();
  await page.getByTestId("qa-ask-open").click();
  const form = page.getByTestId("qa-ask-form");
  await form.getByLabel("Your question").fill(`${marker}: is there a dress code on Fridays?`);
  await form.getByRole("button", { name: "Post question" }).click();
  await expect(page.getByTestId("qa-question").filter({ hasText: `${marker}: is there a dress code` })).toBeVisible({ timeout: 15_000 });

  const ctx = await browser.newContext();
  const staff = await ctx.newPage();
  const mod = await signIn(staff, "qa-mod", { role: "moderator", next: "/admin/qa" });
  users.push(mod.id);
  await completeMfa(staff);
  await expect(staff.getByTestId("admin-qa")).toContainText(`${marker}: is there a dress code`);
  await ctx.close();
});
