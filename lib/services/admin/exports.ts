import { gzipSync } from "node:zlib";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { sendEmail } from "@/lib/email/send";
import { ExportReadyEmail } from "@/lib/email/templates/admin";
import { assertServerOnly } from "@/lib/server-only";
import type { StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/exports");

export const EXPORTS_BUCKET = "exports";
const LINK_HOURS = 24;

/** Content tables only. No auth data, emails, IPs or private schema (§7 data minimisation). */
const TABLES = ["cities", "areas", "categories", "vendors", "vendor_prices", "events", "guides", "safety_info", "platform_settings"] as const;
const OMIT: Partial<Record<(typeof TABLES)[number], string[]>> = {
  vendors: ["search_tsv", "email", "phone", "whatsapp"],
  platform_settings: ["blocklist_phrases"],
};

/**
 * §11.14 async platform export. Runs after the response (next/server `after`), writes a gzipped JSON
 * bundle to the private `exports` bucket and emails the requester a signed link.
 */
export async function runPlatformExport(session: SessionContext, email: string | null, meta: StaffMeta): Promise<string> {
  const admin = getAdminSupabase();
  const bundle: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(t).select("*").range(from, from + 999);
      if (error) throw error;
      rows.push(...((data ?? []) as Record<string, unknown>[]));
      if (!data || data.length < 1000) break;
    }
    const omit = OMIT[t] ?? [];
    bundle[t] = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !omit.includes(k))));
  }
  const path = `platform/${new Date().toISOString().replace(/[:.]/g, "-")}.json.gz`;
  const body = gzipSync(Buffer.from(JSON.stringify({ exported_at: new Date().toISOString(), tables: bundle })));
  const { error: upErr } = await admin.storage.from(EXPORTS_BUCKET).upload(path, body, { contentType: "application/gzip", upsert: false });
  if (upErr) throw upErr;
  const { data: signed } = await admin.storage.from(EXPORTS_BUCKET).createSignedUrl(path, LINK_HOURS * 3600, { download: true });
  await writeAudit({ action: "export.platform_completed", entityType: "storage.exports", entityId: path, after: { tables: TABLES.length, bytes: body.length }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  if (signed?.signedUrl) await sendEmail({ to: email, subject: "Your data export is ready", react: ExportReadyEmail({ url: signed.signedUrl, expiresHours: LINK_HOURS }) });
  return path;
}

export async function listPlatformExports() {
  const admin = getAdminSupabase();
  const { data } = await admin.storage.from(EXPORTS_BUCKET).list("platform", { limit: 10, sortBy: { column: "created_at", order: "desc" } });
  const files = (data ?? []).filter((f) => f.name.endsWith(".json.gz"));
  if (!files.length) return [];
  const { data: urls } = await admin.storage.from(EXPORTS_BUCKET).createSignedUrls(files.map((f) => `platform/${f.name}`), 600, { download: true });
  return files.map((f, i) => ({ name: f.name, size: Number((f.metadata as { size?: number } | null)?.size ?? 0), url: urls?.[i]?.signedUrl ?? null }));
}
