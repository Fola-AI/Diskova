import sharp from "sharp";
import { expect, test, type Page } from "@playwright/test";

import { admin, testEmail, testPassword } from "./fixtures";

const created: string[] = [];

test.afterAll(async () => {
  for (const id of created) await admin().auth.admin.deleteUser(id);
});

async function signedInUser(page: Page, label: string) {
  const email = testEmail(label);
  const password = testPassword();
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.push(data.user.id);
  await page.goto("/login?next=%2Fme%2Fsettings");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/me\/settings$/);
  return { id: data.user.id, email, password };
}

test("edit profile: username, home city, diaspora, location consent", async ({ page }) => {
  const user = await signedInUser(page, "profile");
  const username = `smoke_${user.id.slice(0, 8)}`;
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill("Smoke Tester");
  await page.getByLabel("Home city").selectOption({ label: "Abuja" });
  await page.getByLabel("Yes, diaspora / visitor").check();
  await page.getByText("Use my location when I check in").click();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();

  const { data } = await admin()
    .from("profiles")
    .select("username, display_name, is_diaspora, location_consent, home_city_id")
    .eq("id", user.id)
    .single();
  expect(data).toMatchObject({ username, display_name: "Smoke Tester", is_diaspora: true, location_consent: true });
  expect(data?.home_city_id).not.toBeNull();
});

test("avatar upload goes through the one-image pipeline (EXIF stripped, WebP)", async ({ page }) => {
  const user = await signedInUser(page, "avatar");
  const jpeg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: "#F4B400" } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: "gps-should-vanish" } } })
    .toBuffer();
  await page.locator("#avatar-file").setInputFiles({ name: "me.jpg", mimeType: "image/jpeg", buffer: jpeg });
  await expect(page.getByText("Profile photo updated.")).toBeVisible({ timeout: 20_000 });

  const { data: profile } = await admin().from("profiles").select("avatar_url").eq("id", user.id).single();
  expect(profile?.avatar_url).toMatch(new RegExp(`/storage/v1/object/public/media/avatars/${user.id}/[A-Za-z0-9_-]{12}\\.webp$`));

  const res = await fetch(profile!.avatar_url!);
  const bytes = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(bytes).metadata();
  expect(meta.format).toBe("webp");
  expect([meta.width, meta.height]).toEqual([512, 512]);
  expect(meta.exif).toBeUndefined();
  expect(bytes.includes(Buffer.from("gps-should-vanish"))).toBe(false);

  // The raw upload was removed from the private incoming bucket.
  const { data: incoming } = await admin().storage.from("media-incoming").list(user.id);
  expect(incoming ?? []).toEqual([]);

  // Clean up the published avatar.
  const { data: files } = await admin().storage.from("media").list(`avatars/${user.id}`);
  await admin().storage.from("media").remove((files ?? []).map((f) => `avatars/${user.id}/${f.name}`));
});

test("delete account anonymises the profile and blocks sign-in", async ({ page }) => {
  const user = await signedInUser(page, "delete");
  const { data: before } = await admin().from("profiles").select("username").eq("id", user.id).single();
  await page.getByLabel(/to confirm/).fill(before!.username);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/\?account=deleted$/);

  const { data: after } = await admin()
    .from("profiles")
    .select("username, display_name, deleted_at")
    .eq("id", user.id)
    .single();
  expect(after?.username).toMatch(/^deleted_[0-9a-f]{12}$/);
  expect(after?.display_name).toBeNull();
  expect(after?.deleted_at).not.toBeNull();

  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/don't match/)).toBeVisible();
});
