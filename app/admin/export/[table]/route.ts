import { NextResponse, type NextRequest } from "next/server";

import { currentAal, getSession } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/roles";
import { requestMeta } from "@/lib/http/request-meta";
import { rateLimit } from "@/lib/ratelimit";
import { buildCsvExport, EXPORT_TABLES, exportMinRole, type ExportTable } from "@/lib/services/admin/csv-export";

export const dynamic = "force-dynamic";

/** GET /admin/export/:table?filters — CSV of the current table view. Role + aal2 checked server-side. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const requested = (await params).table;
  const table = EXPORT_TABLES.find((t): t is ExportTable => t === requested);
  const session = await getSession();
  if (!table || !session || !roleAtLeast(session.profile.role, exportMinRole(table)) || session.profile.status === "suspended" || session.profile.status === "banned") {
    return new NextResponse("Not found", { status: 404 });
  }
  if ((await currentAal(session.supabase)).current !== "aal2") return new NextResponse("MFA required", { status: 401 });
  const rl = await rateLimit("exportUser", session.user.id);
  if (!rl.ok) return new NextResponse("Too many exports — try again shortly.", { status: 429 });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { csv } = await buildCsvExport(session, table, sp, await requestMeta());
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${table}-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
