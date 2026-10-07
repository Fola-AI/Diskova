import { expect, test } from "@playwright/test";

const PAGES = ["/", "/c/lagos", "/events", "/guides", "/safety/lagos", "/login", "/privacy"];

test("CSP is enforced and key pages (incl. the map) raise no violations", async ({ page }) => {
  const res = await page.request.get("/");
  const csp = res.headers()["content-security-policy"];
  expect(csp).toBeTruthy();
  expect(csp).not.toContain("unsafe-eval");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(res.headers()["content-security-policy-report-only"]).toBeUndefined();
  expect(res.headers()["strict-transport-security"]).toContain("max-age=");
  expect(res.headers()["x-frame-options"]).toBe("DENY");

  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
  });
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp), path).toEqual([]);
  }
  // Mapbox GL (workers from blob:, tiles, styles) must work under the enforced policy.
  await page.goto("/c/lagos");
  await page.getByRole("button", { name: /map/i }).first().click();
  await expect(page.locator(".mapboxgl-canvas")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)).toEqual([]);
});

test.describe("cookie consent (analytics only)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("first visit asks; 'Essential only' is remembered; footer reopens the choice", async ({ page, context }) => {
    await page.goto("/");
    const banner = page.getByTestId("consent-banner");
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Essential only" }).click();
    await expect(banner).toBeHidden();
    const cookie = (await context.cookies()).find((c) => c.name === "consent");
    expect(cookie?.value).toBe("essential");

    await page.reload();
    await expect(page.getByTestId("consent-banner")).toBeHidden();
    await page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings" }).click();
    await expect(page.getByTestId("consent-banner")).toBeVisible();
    await page.getByRole("button", { name: "Allow analytics" }).click();
    expect((await context.cookies()).find((c) => c.name === "consent")?.value).toBe("analytics");
  });

  test("privacy policy covers cookies, processors, retention and rights", async ({ page }) => {
    await page.goto("/privacy");
    for (const h of ["Cookies", "Who processes data for us", "How long we keep it", "Your rights"]) {
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /@/ }).first()).toHaveAttribute("href", /^mailto:/);
  });
});
