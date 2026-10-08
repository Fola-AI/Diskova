import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/http/cron-auth";
import { sendDailyDigest } from "@/lib/services/admin/digest";

export const dynamic = "force-dynamic";

/** Vercel daily cron at 07:00 UTC = 08:00 WAT (vercel.json). */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  const { data, result } = await sendDailyDigest();
  return NextResponse.json({ ok: true, sent: result.sent, skipped: result.skipped ?? null, date: data.date });
}
