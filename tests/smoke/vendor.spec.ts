import sharp from "sharp";
import { expect, test } from "@playwright/test";

import { admin, completeMfa, signIn } from "./fixtures";

/**
 * Stage L5 acceptance:
 *  - fresh account → submitted vendor in < 10 minutes (wizard with autosave)
 *  - admin approves (MFA) → listing is live
 *  - official update appears on the vendor page labelled "Official"
 *  - claim flow for an unowned listing
 */
const users: string[] = [];
const vendors: string[] = [];

test.afterAll(async () => {
  const a = admin();
  if (vendors.length) await a.from("vendors").delete().in("id", vendors);
  for (const id of users) await a.auth.admin.deleteUser(id);
});

test.describe.configure({ mode: "serial" });

let vendorSlug = "";
let vendorId = "";

test("fresh account → submitted vendor in under 10 minutes", async ({ page }) => {
  const started = Date.now();
  const owner = await signIn(page, "vendor-owner", { next: "/vendor" });
  users.push(owner.id);
  await expect(page).toHaveURL(/\/vendor$/);
  await page.getByRole("link", { name: "List your venue" }).click();

  // Step 1 — basics (creates the draft)
  await expect(page.getByText(/Listing your venue is/)).toBeVisible(); // free-listing notice at step 1
  await page.getByLabel("Venue name").fill(`Smoke Lounge ${owner.id.slice(0, 6)}`);
  await page.getByLabel("Category").selectOption({ label: "Lounge" });
  await page.getByLabel("Area").selectOption({ label: "Victoria Island" });
  await page.getByLabel("Street address").fill("1 Test Close, Victoria Island");
  await page.getByLabel("Tagline").fill("Smoke-test lounge");
  await page.getByRole("button", { name: "Create listing and continue" }).click();
  await expect(page).toHaveURL(/step=contact/);

  // Step 2 — contact (autosave + Next flush)
  await page.getByLabel("WhatsApp number").fill("0803 123 4567");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/step=photos/);

  // Step 3 — photos: one cover through the one-image pipeline
  const cover = await sharp({ create: { width: 1200, height: 700, channels: 3, background: "#0B7A3B" } }).jpeg().toBuffer();
  await page.getByTestId("upload-cover").setInputFiles({ name: "cover.jpg", mimeType: "image/jpeg", buffer: cover });
  await expect(page.getByText("Photo added.")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/step=details/);

  // Step 4 — details
  await page.getByLabel("Price band").selectOption({ label: "₦₦ Mid-range" });
  await page.getByRole("button", { name: "Add hours on Friday" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/step=prices/);

  // Step 5 — prices
  await page.getByLabel("Item").first().fill("Cocktails from");
  await page.getByLabel("Price in naira").first().fill("6,000");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/step=review/);

  // Step 6 — review & submit
  await expect(page.getByText("Ready to submit.")).toBeVisible();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page).toHaveURL(/\/vendor\?submitted=1$/);
  await expect(page.getByTestId("vendor-status")).toHaveText("In review");

  const { data } = await admin()
    .from("vendors")
    .select("id, slug, status, owner_profile_id, claim_status, whatsapp, price_band, cover_image_url")
    .eq("owner_profile_id", owner.id)
    .single();
  expect(data).toMatchObject({ status: "pending_review", claim_status: "claimed", price_band: "mid" });
  expect(data?.cover_image_url).toContain("/vendor-assets/");
  vendorSlug = data!.slug;
  vendorId = data!.id;
  vendors.push(vendorId);
  const { count } = await admin().from("vendor_prices").select("*", { count: "exact", head: true }).eq("vendor_id", vendorId);
  expect(count).toBe(1);

  expect(Date.now() - started).toBeLessThan(10 * 60_000);
});

test("admin (with MFA) approves the listing and it goes live", async ({ page }) => {
  const staff = await signIn(page, "vendor-admin", { role: "admin", next: "/admin/vendors" });
  users.push(staff.id);
  await completeMfa(page);
  await expect(page).toHaveURL(/\/admin\/vendors$/);
  const card = page.getByTestId("pending-vendor").filter({ hasText: "Smoke Lounge" }).first();

  // Reject without a reason is refused.
  await card.getByRole("button", { name: "Reject" }).click();
  await expect(card.getByText(/Give a reason/)).toBeVisible();

  await card.getByRole("button", { name: "Approve & publish" }).click();
  // The approved listing leaves the queue once the page revalidates.
  await expect
    .poll(async () => (await admin().from("vendors").select("status").eq("id", vendorId).single()).data?.status, { timeout: 15_000 })
    .toBe("published");
  await expect(page.getByTestId("pending-vendor").filter({ hasText: "Smoke Lounge" })).toHaveCount(0);

  const res = await page.goto(`/v/${vendorSlug}`);
  expect(res?.status()).toBe(200);
});

test("official update in two taps appears on the vendor page labelled Official", async ({ page }) => {
  const { data: owner } = await admin().from("vendors").select("owner_profile_id").eq("id", vendorId).single();
  const { data: userRes } = await admin().auth.admin.getUserById(owner!.owner_profile_id!);
  // Sign in as the owner again (new password).
  const password = `Owner-${Date.now()}Aa1`;
  await admin().auth.admin.updateUserById(owner!.owner_profile_id!, { password });
  await page.goto("/login?next=%2Fvendor%2Fupdate");
  await page.getByLabel("Email").fill(userRes.user!.email!);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/vendor\/update$/);

  await page.getByRole("button", { name: "Busy" }).click(); // tap 1
  await page.getByRole("button", { name: "Post official update" }).click(); // tap 2
  await expect(page.getByText("Posted! Your update is live on your page.")).toBeVisible();

  await page.goto(`/v/${vendorSlug}`);
  const update = page.getByTestId("official-update").first();
  await expect(update).toBeVisible();
  await expect(update.getByText("Official", { exact: true })).toBeVisible(); // unverified vendor → "Official"
  await expect(update.getByText("Busy")).toBeVisible();
});

test("claim flow: claimant uploads ID, admin approves, claimant becomes owner", async ({ browser }) => {
  const a = admin();
  const { data: seed } = await a.from("vendors").select("id, slug").eq("is_seed", true).eq("status", "published").eq("claim_status", "unclaimed").limit(1).single();
  const claimantCtx = await browser.newContext();
  const page = await claimantCtx.newPage();
  const claimant = await signIn(page, "claimant", { next: `/vendor/onboarding?claim=${seed!.slug}` });
  users.push(claimant.id);
  try {
    await expect(page.getByRole("heading", { name: /^Claim / })).toBeVisible();
    const png = await sharp({ create: { width: 200, height: 120, channels: 3, background: "#ddd" } }).png().toBuffer();
    await page.getByTestId("doc-id").setInputFiles({ name: "id.png", mimeType: "image/png", buffer: png });
    await expect(page.getByRole("button", { name: /Photo ID .*uploaded/ })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Venue's official Instagram or website").fill("instagram.com/example");
    await page.getByRole("button", { name: "Submit claim" }).click();
    // Either the inline confirmation or, after the page refreshes, the "in review" state.
    await expect(page.getByText(/we'll review your documents|Your claim is in review/i)).toBeVisible();

    const staffCtx = await browser.newContext();
    const staffPage = await staffCtx.newPage();
    const staff = await signIn(staffPage, "claim-admin", { role: "admin", next: "/admin/vendors" });
    users.push(staff.id);
    await completeMfa(staffPage);
    const { data: claimantProfile } = await a.from("profiles").select("username").eq("id", claimant.id).single();
    const card = staffPage
      .getByTestId("verification-request")
      .filter({ hasText: "Claim" })
      .filter({ hasText: `@${claimantProfile!.username}` });
    await expect(card.getByRole("link", { name: "Photo ID" })).toHaveAttribute("href", /token=/); // signed URL
    await card.getByRole("button", { name: "Approve" }).click();
    await expect
      .poll(async () => (await a.from("vendors").select("claim_status").eq("id", seed!.id).single()).data?.claim_status, { timeout: 15_000 })
      .toBe("claimed");
    await staffCtx.close();

    const { data: after } = await a.from("vendors").select("owner_profile_id, claim_status, verified").eq("id", seed!.id).single();
    expect(after).toMatchObject({ owner_profile_id: claimant.id, claim_status: "claimed", verified: true });
    const { data: member } = await a.from("vendor_members").select("role").eq("vendor_id", seed!.id).eq("profile_id", claimant.id).single();
    expect(member?.role).toBe("owner");
  } finally {
    // Restore the sample vendor and close any request this test left pending.
    const { data: pending } = await a.rpc("admin_list_verification_requests", { p_status: "pending" });
    for (const r of (pending ?? []).filter((r) => r.vendor_id === seed!.id)) {
      await a.rpc("admin_decide_verification_request", { p_id: r.id, p_status: "rejected", p_reviewer: claimant.id, p_reason: "smoke test cleanup" });
    }
    await a.from("vendor_members").delete().eq("vendor_id", seed!.id);
    await a.from("vendors").update({ owner_profile_id: null, claim_status: "unclaimed", verified: false, verified_at: null, verified_by: null }).eq("id", seed!.id);
    const { data: docs } = await a.storage.from("verification-docs").list(`${seed!.id}/${claimant.id}`);
    if (docs?.length) await a.storage.from("verification-docs").remove(docs.map((d) => `${seed!.id}/${claimant.id}/${d.name}`));
    await claimantCtx.close();
  }
});
