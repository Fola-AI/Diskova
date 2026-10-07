import { redirect } from "next/navigation";

import type { SessionContext } from "@/lib/auth/guards";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/auth/recent-mfa");

/** Seconds since the last TOTP verification in this session (from the JWT `amr` claim), or null. */
export async function secondsSinceMfa(session: SessionContext): Promise<number | null> {
  const { data } = await session.supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { amr?: Array<{ method: string; timestamp: number }> };
    const totp = (payload.amr ?? []).filter((a) => a.method === "totp" || a.method === "mfa/totp").map((a) => a.timestamp);
    if (!totp.length) return null;
    return Math.floor(Date.now() / 1000) - Math.max(...totp);
  } catch {
    return null;
  }
}

/**
 * §11.4: sensitive actions (role changes) re-prompt for MFA. Requires a TOTP verification within the
 * last `maxAgeSeconds`; otherwise sends the admin to verify again and come back.
 */
export async function requireRecentMfa(session: SessionContext, returnTo: string, maxAgeSeconds = 300): Promise<void> {
  const age = await secondsSinceMfa(session);
  if (age === null || age > maxAgeSeconds) redirect(`/admin/mfa?reverify=1&next=${encodeURIComponent(returnTo)}`);
}
