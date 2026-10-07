import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/lib/env.server";

/** Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Constant-time compare; no secret → deny. */
export function isAuthorizedCron(req: Request): boolean {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
