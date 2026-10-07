import { expect, test } from "@playwright/test";

import { admin, testEmail, testPassword, totp } from "./fixtures";

const created: string[] = [];

test.afterAll(async () => {
  for (const id of created) await admin().auth.admin.deleteUser(id);
});

async function createStaff(role: "admin" | "user") {
  const email = testEmail(`staff-${role}`);
  const password = testPassword();
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.push(data.user.id);
  if (role !== "user") await admin().from("profiles").update({ role }).eq("id", data.user.id);
  return { email, password };
}

test("admin without MFA is redirected to enrol, and gets in after verifying a TOTP code", async ({ page }) => {
  const { email, password } = await createStaff("admin");
  await page.goto("/login?next=%2Fadmin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // aal1 session → bounced to MFA enrolment.
  await expect(page).toHaveURL(/\/admin\/mfa\?next=%2Fadmin$/);
  await expect(page.getByAltText("QR code for your authenticator app")).toBeVisible();

  // Enrol with the shown secret and verify.
  await page.getByText("Can't scan? Enter this key instead").click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.getByLabel("Authentication code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("MFA verified")).toBeVisible();
});

test("non-staff users get a 404 for admin pages", async ({ page }) => {
  const { email, password } = await createStaff("user");
  await page.goto("/login?next=%2Fadmin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  const mfa = await page.goto("/admin/mfa");
  expect(mfa?.status()).toBe(404);
});
