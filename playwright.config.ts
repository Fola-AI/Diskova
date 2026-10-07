import { defineConfig, devices } from "@playwright/test";

import "./tests/setup/load-env";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  // Every spec talks to the shared DEV Supabase project; 3 workers keeps latency realistic.
  workers: 3,
  // Navigation/UI assertions. Performance limits (< 5 s requests, ≤ 2 s Realtime) are asserted explicitly.
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Most specs aren't about cookie consent: start with "essential only" chosen so the banner
    // doesn't cover controls. security.spec.ts clears it to test the banner itself.
    storageState: {
      cookies: [{ name: "consent", value: "essential", domain: new URL(baseURL).hostname, path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }],
      origins: [],
    },
  },
  projects: [
    {
      name: "smoke",
      // Mobile-first: smoke runs at a 375px-class viewport.
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  // Reuse the production build produced by `next build` earlier in `npm run verify`.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx dotenv -e .env.local -- next start -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
