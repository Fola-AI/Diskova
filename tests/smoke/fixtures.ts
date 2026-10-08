import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

export const runId = `${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;

export function admin(): SupabaseClient<Database> {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function testPassword(): string {
  return `Smoke-${randomBytes(9).toString("hex")}A1`;
}

export function testEmail(label: string): string {
  return `smoke-${label}-${runId}@example.com`;
}

/** RFC 6238 TOTP (SHA-1, 30 s, 6 digits) from a base32 secret — test helper only. */
export function totp(base32Secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = base32Secret.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hmac = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}


/** Create a confirmed user (optionally with a role), sign in through the UI and land on `next`. */
export async function signIn(page: Page, label: string, opts: { role?: "admin" | "moderator" | "super_admin"; next?: string } = {}) {
  const email = testEmail(label);
  const password = testPassword();
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  if (opts.role) await admin().from("profiles").update({ role: opts.role }).eq("id", data.user.id);
  await page.goto(`/login?next=${encodeURIComponent(opts.next ?? "/me")}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  return { id: data.user.id, email, password };
}

/** For staff: complete TOTP enrolment on /admin/mfa so the session is aal2. */
export async function completeMfa(page: Page) {
  await page.getByText("Can't scan? Enter this key instead").click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.getByLabel("Authentication code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
}

/** Storage state with everything except the cookie-consent choice (keeps the Vercel preview bypass). */
export function stateWithoutConsent(): { cookies: Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Strict" | "Lax" | "None" }>; origins: [] } {
  try {
    const state = JSON.parse(readFileSync("playwright/.auth/state.json", "utf8")) as { cookies: Array<{ name: string; value: string; domain: string; path: string; expires: number; httpOnly: boolean; secure: boolean; sameSite: "Strict" | "Lax" | "None" }> };
    return { cookies: state.cookies.filter((c) => c.name !== "consent"), origins: [] };
  } catch {
    return { cookies: [], origins: [] };
  }
}
