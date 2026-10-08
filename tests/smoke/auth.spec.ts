import { expect, test } from "@playwright/test";

import { admin, testEmail, testPassword } from "./fixtures";

const created: string[] = [];

test.afterAll(async () => {
  for (const id of created) await admin().auth.admin.deleteUser(id);
});

test("home renders the branded shell with security headers", { tag: "@readonly" }, async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  expect(res?.headers()["x-frame-options"]).toBe("DENY");
  expect(res?.headers()["content-security-policy"]).toContain("default-src 'self'"); // enforced since L13
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Unverified").or(page.getByText("Community posts are shared"))).toBeVisible();
});

test("protected pages send anonymous visitors to login with a safe next", { tag: "@readonly" }, async ({ page }) => {
  await page.goto("/me/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fme%2Fsettings$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
});

test("signup form validates before calling the server", { tag: "@readonly" }, async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Please accept the Terms and Privacy Policy.")).toBeVisible();
});

test("signup → verify → login", async ({ page }) => {
  const email = testEmail("signup");
  const password = testPassword();

  // SIGNUP: create the unconfirmed account and get its confirmation token without sending email
  // (CLAUDE.md: never depend on real email delivery in tests).
  const { data, error } = await admin().auth.admin.generateLink({ type: "signup", email, password });
  expect(error).toBeNull();
  created.push(data.user!.id);

  // An unverified account cannot sign in (and therefore cannot post).
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/confirm your email first/i)).toBeVisible();

  // VERIFY: open the confirmation link (token_hash form, verified server-side by /auth/callback).
  await page.goto(
    `/auth/callback?token_hash=${data.properties!.hashed_token}&type=signup&next=${encodeURIComponent("/me?welcome=1")}`,
  );
  await expect(page).toHaveURL(/\/me\?welcome=1$/);
  await expect(page.getByText("Your email is confirmed. Welcome!")).toBeVisible();

  // Profile reflects verification (synced from auth.users by trigger).
  const { data: profile } = await admin().from("profiles").select("email_verified_at").eq("id", data.user!.id).single();
  expect(profile?.email_verified_at).not.toBeNull();

  // Sign out, then LOGIN with the password.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/login?next=%2Fme%2Fsettings");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/me\/settings$/);
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("used or invalid links land on login with a clear message", { tag: "@readonly" }, async ({ page }) => {
  await page.goto("/auth/callback?token_hash=not-a-real-token&type=signup");
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(page.getByText(/expired or was already used/i)).toBeVisible();
});

test("open redirects are refused after login", async ({ page }) => {
  const email = testEmail("redirect");
  const password = testPassword();
  const { data } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  created.push(data.user!.id);
  await page.goto("/login?next=%2F%2Fevil.example");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/me$/);
});

test("password reset: recovery link → choose new password → sign in with it", async ({ page }) => {
  const email = testEmail("reset");
  const oldPassword = testPassword();
  const newPassword = testPassword();
  const { data: created1 } = await admin().auth.admin.createUser({ email, password: oldPassword, email_confirm: true });
  created.push(created1.user!.id);

  const { data, error } = await admin().auth.admin.generateLink({ type: "recovery", email });
  expect(error).toBeNull();
  await page.goto(`/auth/callback?token_hash=${data.properties!.hashed_token}&type=recovery`);
  await expect(page).toHaveURL(/\/reset\/update$/);

  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/me\?password=updated$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/me$/);
});
