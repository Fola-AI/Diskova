import { createGzip } from "node:zlib";

import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/admin/backup");

export const BACKUPS_BUCKET = "backups";
export const BACKUP_RETENTION_DAYS = 56; // 8 weeks (privacy policy says "up to 8 weeks")
const PAGE = 1000;

export interface BackupResult {
  path: string;
  bytes: number;
  tables: Record<string, number>;
  pruned: string[];
}

/** Gzip a stream of NDJSON lines without holding the whole uncompressed dump in memory. */
async function gzipLines(lines: AsyncIterable<string>): Promise<Buffer> {
  const gz = createGzip({ level: 6 });
  const chunks: Buffer[] = [];
  gz.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    gz.on("end", resolve);
    gz.on("error", reject);
  });
  for await (const line of lines) {
    if (!gz.write(line)) await new Promise((r) => gz.once("drain", r));
  }
  gz.end();
  await done;
  return Buffer.concat(chunks);
}

/**
 * §7.13 weekly logical backup: every public + private table (except activity telemetry) as
 * gzipped NDJSON — line 1 is a header, then `{"t":"schema.table","r":{...row}}` per row.
 * Auth users are Supabase-managed and covered by PROD point-in-time recovery.
 */
export async function runBackup(now = new Date()): Promise<BackupResult> {
  const admin = getAdminSupabase();
  const { data: tables, error } = await admin.rpc("admin_backup_tables");
  if (error || !tables) throw new Error(`backup: listing tables failed: ${error?.message}`);
  const counts: Record<string, number> = {};

  async function* lines(): AsyncGenerator<string> {
    yield `${JSON.stringify({ kind: "header", format: "ndjson-v1", created_at: now.toISOString(), tables: tables!.map((t) => `${t.schema_name}.${t.table_name}`) })}\n`;
    for (const t of tables!) {
      const name = `${t.schema_name}.${t.table_name}`;
      counts[name] = 0;
      for (let offset = 0; ; offset += PAGE) {
        const { data, error: e } = await admin.rpc("admin_backup_rows", { p_schema: t.schema_name, p_table: t.table_name, p_offset: offset, p_limit: PAGE });
        if (e) throw new Error(`backup: ${name} failed: ${e.message}`);
        const rows = (data ?? []) as unknown[];
        for (const r of rows) yield `${JSON.stringify({ t: name, r })}\n`;
        counts[name] += rows.length;
        if (rows.length < PAGE) break;
      }
    }
  }

  const body = await gzipLines(lines());
  const path = `weekly/${now.toISOString().slice(0, 10)}.ndjson.gz`;
  const { error: upErr } = await admin.storage.from(BACKUPS_BUCKET).upload(path, body, { contentType: "application/gzip", upsert: true });
  if (upErr) throw new Error(`backup: upload failed: ${upErr.message}`);

  // Retention: drop weekly files older than 8 weeks.
  const { data: files } = await admin.storage.from(BACKUPS_BUCKET).list("weekly", { limit: 1000 });
  const cutoff = new Date(now.getTime() - BACKUP_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  const pruned = (files ?? []).map((f) => f.name).filter((n) => /^\d{4}-\d{2}-\d{2}\.ndjson\.gz$/.test(n) && n.slice(0, 10) < cutoff).map((n) => `weekly/${n}`);
  if (pruned.length) await admin.storage.from(BACKUPS_BUCKET).remove(pruned);

  await writeAudit({ action: "system.backup", entityType: "storage.backups", entityId: path, after: { bytes: body.length, tables: counts, pruned }, actorRole: "system" });
  return { path, bytes: body.length, tables: counts, pruned };
}
