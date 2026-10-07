import { expect, test } from "@playwright/test";

const GUIDE = "/guides/lagos/sample-lagos-first-weekend";

test("PWA: a guide read online opens offline; other pages fall back to /offline listing saved guides", async ({ page, context }) => {
  test.skip(!(await page.request.get(GUIDE)).ok(), "sample guide not on this database (npm run db:samples)");
  await page.goto("/safety");
  // Wait for the service worker to install, activate and control the page.
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).active))).toBe(true);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 15_000 });

  await page.goto(GUIDE);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("first weekend");

  await context.setOffline(true);
  try {
    await page.goto(GUIDE);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("first weekend");

    await page.goto("/events");
    await expect(page.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible();
    await expect(page.getByTestId("saved-guides")).toContainText("sample lagos first weekend");
  } finally {
    await context.setOffline(false);
  }
});

test("PWA: the service worker never caches signed-in or admin pages", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  expect(sw).toContain("admin|api|auth|me|vendor");
  expect(sw).toContain("MAX_PAGES = 20");
  const res = await request.get("/sw.js");
  expect(res.headers()["cache-control"]).toContain("no-cache");
});
