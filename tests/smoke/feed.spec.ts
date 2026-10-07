import sharp from "sharp";
import { expect, test } from "@playwright/test";

import { admin, signIn } from "./fixtures";

/**
 * Stage L6 acceptance:
 *  - two browsers: post in one, appears in the other ≤ 2 s (signed in, Realtime) / ≤ 30 s (anon, polling)
 *  - pulse is one tap
 *  - a 4-image check-in completes without any single request > 5 s
 */
test.describe.configure({ mode: "serial" });

const users: string[] = [];
let vendor: { id: string; slug: string };

test.beforeAll(async () => {
  const a = admin();
  // Owerri, so venues created here don't change the Lagos counts other smoke tests look at.
  const { data: city } = await a.from("cities").select("id").eq("slug", "owerri").single();
  const { data: cat } = await a.from("categories").select("id").eq("slug", "bar").single();
  const slug = `smoke-feed-${Date.now().toString(36)}`;
  const { data } = await a
    .from("vendors")
    .insert({ slug, name: "Smoke Feed Bar", category_id: cat!.id, city_id: city!.id, location: "SRID=4326;POINT(7.03 5.49)", status: "published" })
    .select("id, slug")
    .single();
  vendor = data!;
});

test.afterAll(async () => {
  const a = admin();
  const { data: media } = await a.from("post_media").select("storage_path, post:posts!inner(vendor_id)").eq("post.vendor_id", vendor.id);
  if (media?.length) await a.storage.from("media").remove(media.map((m) => m.storage_path));
  await a.from("vendors").delete().eq("id", vendor.id);
  for (const id of users) await a.auth.admin.deleteUser(id);
});

test("one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s", async ({ browser }) => {
  const viewerCtx = await browser.newContext();
  const viewer = await viewerCtx.newPage();
  users.push((await signIn(viewer, "feed-viewer", { next: `/v/${vendor.slug}` })).id);
  await expect(viewer.getByTestId("live-feed")).toHaveAttribute("data-live", "realtime", { timeout: 15_000 });

  const anonCtx = await browser.newContext();
  const anon = await anonCtx.newPage();
  await anon.goto(`/v/${vendor.slug}`);
  await expect(anon.getByTestId("live-feed")).toHaveAttribute("data-live", "polling");

  const posterCtx = await browser.newContext();
  const poster = await posterCtx.newPage();
  const posterUser = await signIn(poster, "feed-poster", { next: `/v/${vendor.slug}` });
  users.push(posterUser.id);
  const { data: profile } = await admin().from("profiles").select("username").eq("id", posterUser.id).single();

  // ONE tap.
  await poster.getByRole("button", { name: "Pulse: Packed" }).click();
  await expect(poster.getByText(/Thanks! \+1 point/)).toBeVisible();
  const postedAt = Date.now();

  const viewerPost = viewer.getByTestId("feed-post").filter({ hasText: `@${profile!.username}` });
  await expect(viewerPost).toBeVisible({ timeout: 2_000 });
  const realtimeMs = Date.now() - postedAt;
  expect(realtimeMs).toBeLessThanOrEqual(2_000);

  await expect(anon.getByTestId("feed-post").filter({ hasText: `@${profile!.username}` })).toBeVisible({ timeout: 30_000 });
  expect(Date.now() - postedAt).toBeLessThanOrEqual(30_000);
  test.info().annotations.push({ type: "realtime-ms", description: String(realtimeMs) });

  await Promise.all([viewerCtx.close(), anonCtx.close(), posterCtx.close()]);
});

test("4-photo check-in: every request finishes in under 5 s", async ({ page }) => {
  const user = await signIn(page, "feed-photos", { next: `/v/${vendor.slug}` });
  users.push(user.id);
  // An established account, so photos publish rather than being held for review.
  await admin().from("profiles").update({ created_at: new Date(Date.now() - 30 * 86_400_000).toISOString() }).eq("id", user.id);

  const slow: string[] = [];
  const durations: number[] = [];
  const serverMs: number[] = [];
  page.on("response", (res) => {
    const t = /process;dur=(\d+)/.exec(res.headers()["server-timing"] ?? "");
    if (t) serverMs.push(Number(t[1]));
  });
  page.on("requestfinished", (req) => {
    // responseEnd is relative to startTime (ms); -1 when unavailable.
    const ms = req.timing().responseEnd;
    if (req.method() === "POST" || req.url().includes("/storage/v1/object/upload")) {
      durations.push(ms);
      if (ms > 5_000) slow.push(`${req.method()} ${req.url()} ${Math.round(ms)}ms`);
    }
  });

  const photos = await Promise.all(
    ["#0B7A3B", "#F4B400", "#7A0B4B", "#0B5E7A"].map(async (color, i) => ({
      name: `p${i}.jpg`,
      mimeType: "image/jpeg",
      buffer: await sharp({ create: { width: 2400, height: 1800, channels: 3, background: color, noise: { type: "gaussian", mean: 128, sigma: 40 } } })
        .jpeg({ quality: 85 })
        .toBuffer(),
    })),
  );

  await page.getByRole("button", { name: "Check in" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Busy" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Lit" }).click();
  await page.getByTestId("checkin-photos").setInputFiles(photos);
  await expect(page.getByRole("button", { name: "Add photo (4/4)" })).toBeVisible();
  await page.getByRole("button", { name: "Post check-in" }).click();
  await expect(page.getByText(/Checked in! \+\d+ points/)).toBeVisible({ timeout: 60_000 });

  expect(slow).toEqual([]);
  expect(Math.min(...durations)).toBeGreaterThan(0); // the measurement is real
  expect(durations.length).toBeGreaterThanOrEqual(4 * 2 + 2); // 4 uploads + 4 process calls + create + finalize
  test.info().annotations.push(
    { type: "max-request-ms", description: String(Math.round(Math.max(...durations))) },
    { type: "server-process-ms", description: serverMs.join(",") },
  );

  const { data: post } = await admin()
    .from("posts")
    .select("status, media:post_media(id, processed_at)")
    .eq("author_id", user.id)
    .eq("kind", "checkin")
    .single();
  expect(post?.status).toBe("published");
  expect(post?.media).toHaveLength(4);

  await page.goto(`/v/${vendor.slug}`);
  const card = page.getByTestId("feed-post").filter({ has: page.locator("img") }).first();
  await expect(card.getByText("Community photo · Unverified")).toBeVisible();
  await expect(card.getByText("Unverified — posted by a community member")).toBeVisible();
});

test("my posts, public profile and leaderboard pages render", async ({ page }) => {
  const user = await signIn(page, "feed-profile", { next: `/v/${vendor.slug}` });
  users.push(user.id);
  await page.getByRole("button", { name: "Pulse: Chill" }).click();
  await expect(page.getByText(/Thanks/)).toBeVisible();

  await page.goto("/me/posts");
  await expect(page.getByTestId("my-post").first().getByTestId("my-post-status")).toHaveText("Live");

  const { data: profile } = await admin().from("profiles").select("username").eq("id", user.id).single();
  const res = await page.goto(`/u/${profile!.username}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByText("1 points").or(page.getByText(/points/)).first()).toBeVisible();
  await expect(page.getByTestId("feed-post").first()).toBeVisible();

  const lb = await page.goto("/leaderboard/lagos");
  expect(lb?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /Lagos leaderboard/ })).toBeVisible();
  await page.getByRole("link", { name: "December in Nigeria" }).click();
  await expect(page).toHaveURL(/board=december/);
});
