import { NextResponse } from "next/server";

import { isAuthorizedCron } from "@/lib/http/cron-auth";
import { runBackup } from "@/lib/services/admin/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel weekly cron (vercel.json): Sundays 03:00 UTC = 04:00 WAT. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse("Unauthorized", { status: 401 });
  const r = await runBackup();
  return NextResponse.json({ ok: true, path: r.path, bytes: r.bytes, rows: Object.values(r.tables).reduce((a, b) => a + b, 0), pruned: r.pruned.length });
}
