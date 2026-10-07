import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
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
