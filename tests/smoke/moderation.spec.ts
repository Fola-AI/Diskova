import { expect, test } from "@playwright/test";

import { admin, completeMfa, signIn } from "./fixtures";

test.describe.configure({ mode: "serial" });
const users: string[] = [];
let vendorId = "";
let postId = "";

test.beforeAll(async () => {
  const a = admin();
  const { data: city } = await a.from("cities").select("id").eq("slug", "port-harcourt").single();
  const { data: cat } = await a.from("categories").select("id").eq("slug", "bar").single();
  const { data: v } = await a
    .from("vendors")
    .insert({ slug: `smoke-mod-${Date.now().toString(36)}`, name: "Smoke Moderation Bar", category_id: cat!.id, city_id: city!.id, location: "SRID=4326;POINT(7.0 4.82)", status: "published" })
    .select("id")
    .single();
  vendorId = v!.id;
  const { data: u } = await a.auth.admin.createUser({ email: `smoke-held-${Date.now()}@example.com`, password: "Held-Passw0rd-1", email_confirm: true });
  users.push(u.user!.id);
  // A held post (what the pipeline produces for a new account's photo).
  const { data: p } = await a
    .from("posts")
    .insert({ author_id: u.user!.id, vendor_id: vendorId, kind: "checkin", crowd_level: 4, vibe: 4, body: "Held for review smoke", status: "pending", hold_reason: "media_new_account", moderation_decision: "auto_pass" })
    .select("id")
    .single();
  postId = p!.id;
});

test.afterAll(async () => {
  const a = admin();
  await a.from("vendors").delete().eq("id", vendorId);
  for (const id of users) await a.auth.admin.deleteUser(id);
});

test("moderator (MFA) approves a held post from the queue and it goes live", async ({ page }) => {
  const mod = await signIn(page, "smoke-moderator", { role: "moderator", next: "/admin/moderation?source=hold" });
  users.push(mod.id);
  await completeMfa(page);
  await expect(page).toHaveURL(/\/admin\/moderation\?source=hold$/);
  const item = page.getByTestId("moderation-item").filter({ hasText: "Held for review smoke" });
  await expect(item).toBeVisible();
  await expect(item.getByText("hold", { exact: true })).toBeVisible();
  await item.getByRole("button", { name: "Approve", exact: true }).click();
  await expect.poll(async () => (await admin().from("posts").select("status").eq("id", postId).single()).data?.status, { timeout: 15_000 }).toBe("published");
});

test("community guidelines are linked from every page footer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Community Guidelines" }).click();
  await expect(page).toHaveURL(/\/guidelines$/);
  await expect(page.getByRole("heading", { level: 1, name: "Community Guidelines" })).toBeVisible();
});
