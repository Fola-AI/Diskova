import { expect, test } from "@playwright/test";

import { admin, completeMfa, signIn, testEmail } from "./fixtures";

const created: string[] = [];

test.afterAll(async () => {
  for (const id of created) await admin().auth.admin.deleteUser(id);
});

test("moderator: dashboard + live activity stream; settings and user export are 404", async ({ page }) => {
  const mod = await signIn(page, "bo-mod", { role: "moderator", next: "/admin" });
  created.push(mod.id);
  await completeMfa(page);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByTestId("kpi-tile").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name: "Settings" })).toHaveCount(0);

  // Realtime: a new signup appears in the stream without reloading.
  const stream = page.getByTestId("activity-stream");
  await expect(stream).toHaveAttribute("data-live", "realtime", { timeout: 15_000 });
  const { data } = await admin().auth.admin.createUser({ email: testEmail("bo-stream"), password: "Str3am-Passw0rd-x", email_confirm: true });
  created.push(data.user!.id);
  const { data: prof } = await admin().from("profiles").select("username").eq("id", data.user!.id).single();
  await expect(stream.getByTestId("activity-item").filter({ hasText: prof!.username })).toBeVisible({ timeout: 10_000 });

  // Pause buffers new events.
  await page.getByTestId("activity-pause").click();
  await expect(page.getByTestId("activity-pause")).toHaveText(/Resume/);

  const settings = await page.goto("/admin/settings");
  expect(settings?.status()).toBe(404);
  const exp = await page.request.get("/admin/export/users");
  expect(exp.status()).toBe(404);
});

test("super admin: user table shows email, filters, CSV export is audited, settings render", async ({ page }) => {
  const sup = await signIn(page, "bo-super", { role: "super_admin", next: "/admin/users" });
  created.push(sup.id);
  await completeMfa(page);
  await expect(page).toHaveURL(/\/admin\/users$/);

  // Filter by role = super admin → our account is listed with its email.
  await page.getByTestId("filter-bar").getByLabel("Role").selectOption("super_admin");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/role=super_admin/);
  await expect(page.getByTestId("user-table")).toContainText(sup.email);
  await expect(page.getByText("IP addresses are informational only", { exact: false })).toBeVisible();

  const res = await page.request.get("/admin/export/users?role=super_admin");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(await res.text()).toContain(sup.email);
  const { data: audit } = await admin().rpc("admin_list_audit", { p_action_prefix: "export.users", p_actor_id: sup.id, p_limit: 5 });
  expect(audit?.length).toBe(1);

  await page.goto("/admin/settings");
  await expect(page.getByTestId("settings-form")).toBeVisible();
  await expect(page.getByTestId("feature-flags")).toContainText("points");
});

test("admin: vendor table filters + posts bulk hide needs a reason", async ({ page }) => {
  const adm = await signIn(page, "bo-admin", { role: "admin", next: "/admin/vendors?tab=all&no_prices=1" });
  created.push(adm.id);
  await completeMfa(page);
  await expect(page).toHaveURL(/tab=all/);
  await expect(page.getByTestId("vendor-table")).toBeVisible();
  await expect(page.getByTestId("filter-bar").getByLabel("No prices")).toBeChecked();

  // Non-super admins cannot export users.
  expect((await page.request.get("/admin/export/users")).status()).toBe(404);
  expect((await page.request.get("/admin/export/vendors?no_prices=1")).status()).toBe(200);

  await page.goto("/admin/posts");
  await expect(page.getByTestId("post-table")).toBeVisible();
  const form = page.getByTestId("post-bulk-form");
  await form.getByRole("button", { name: "Hide selected" }).click();
  await expect(form.getByRole("alert")).toContainText(/Select at least one post|reason/i);
});

test("super admin creates an agent key (shown once), the key works, then is revoked", async ({ page }) => {
  const sup = await signIn(page, "bo-agentkey", { role: "super_admin", next: "/admin/settings" });
  created.push(sup.id);
  await completeMfa(page);
  await expect(page).toHaveURL(/\/admin\/settings/);
  const form = page.getByTestId("agent-key-form");
  await form.getByLabel("Name").fill("Smoke agent");
  await form.getByRole("button", { name: "Create key" }).click();
  const key = (await page.getByTestId("agent-key-once").locator("code").textContent())!.trim();
  expect(key).toMatch(/^dk_[0-9a-f]{8}_/);

  const ok = await page.request.get("/api/agent/v1/summary", { headers: { "x-agent-key": key } });
  expect(ok.status()).toBe(200);

  await page.reload();
  await expect(page.getByTestId("agent-key-once")).toHaveCount(0); // never shown again
  const row = page.getByTestId("agent-keys").locator("li", { hasText: key.slice(0, 11) });
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(row).toContainText(/revoked/i);
  const revoked = await page.request.get("/api/agent/v1/summary", { headers: { "x-agent-key": key } });
  expect(revoked.status()).toBe(401);
});
