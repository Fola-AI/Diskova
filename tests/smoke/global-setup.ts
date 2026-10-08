import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { request, type FullConfig } from "@playwright/test";

export const STATE_FILE = "playwright/.auth/state.json";

/**
 * Builds the storage state every smoke test starts from:
 *  - `consent=essential`, so the cookie banner doesn't cover controls (security.spec tests the banner);
 *  - on a protected Vercel Preview, Vercel's bypass cookie. It's obtained once via the documented query
 *    parameters, so the secret is never sent as a header to third-party origins (Supabase, Mapbox).
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]!.use.baseURL!;
  const host = new URL(baseURL).hostname;
  const cookies: Array<Record<string, unknown>> = [
    { name: "consent", value: "essential", domain: host, path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" },
  ];
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (process.env.PLAYWRIGHT_BASE_URL && secret) {
    const ctx = await request.newContext();
    const res = await ctx.get(`${baseURL}/?x-vercel-protection-bypass=${encodeURIComponent(secret)}&x-vercel-set-bypass-cookie=samesitenone`, { maxRedirects: 0 });
    const state = await ctx.storageState();
    await ctx.dispose();
    if (![200, 307, 308].includes(res.status()) || !state.cookies.length) throw new Error(`Vercel bypass failed (HTTP ${res.status()}). Check VERCEL_AUTOMATION_BYPASS_SECRET.`);
    cookies.push(...state.cookies);
  }
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify({ cookies, origins: [] }, null, 2));
}
