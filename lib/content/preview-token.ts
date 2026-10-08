import { createHmac, timingSafeEqual } from "node:crypto";

import { requireServerEnv } from "@/lib/env.server";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/content/preview-token");

/** Signed, expiring draft-preview links for the CMS (§11.7). */
const TTL_MS = 60 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", requireServerEnv("TOKEN_ENCRYPTION_KEY")).update(`guide-preview:${payload}`).digest("base64url");
}

export function createPreviewToken(guideId: string, now = Date.now()): string {
  const exp = now + TTL_MS;
  return `${exp}.${sign(`${guideId}.${exp}`)}`;
}

export function verifyPreviewToken(guideId: string, token: string | null | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < now || !sig) return false;
  const expected = Buffer.from(sign(`${guideId}.${exp}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
