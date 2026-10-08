import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { flag, one, pick, sortOf, uuidParam, type SearchParams } from "@/lib/admin/params";
import { toCsv } from "@/lib/admin/csv";
import { roleAtLeast, USER_ROLES, type UserRole } from "@/lib/auth/roles";
import { Constants } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";
import { listPostsAdmin } from "@/lib/services/admin/posts";
import { listUsers } from "@/lib/services/admin/users";
import { listVendorsTable } from "@/lib/services/admin/vendors";
import type { StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/csv-export");

export const EXPORT_TABLES = ["vendors", "users", "posts", "audit", "issues"] as const;
export type ExportTable = (typeof EXPORT_TABLES)[number];
const MAX_ROWS = 10_000;
const E = Constants.public.Enums;

/** §11: CSV export is admin+; the user table is super_admin only. Every export is audited. */
export function exportMinRole(table: ExportTable): UserRole {
  return table === "users" ? "super_admin" : "admin";
}

async function paged<T>(fetch: (offset: number, limit: number) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += 1000) {
    const rows = await fetch(offset, 1000);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out.slice(0, MAX_ROWS);
}

export async function buildCsvExport(session: SessionContext, table: ExportTable, sp: SearchParams, meta: StaffMeta): Promise<{ csv: string; rows: number }> {
  if (!roleAtLeast(session.profile.role, exportMinRole(table))) throw new Error("forbidden");
  let rows: Array<Record<string, unknown>> = [];
  let columns: string[] | undefined;

  if (table === "vendors") {
    const { sort, desc } = sortOf(sp, ["name", "city", "status", "completeness", "posts_7d", "official_updates_7d", "open_reports", "last_activity_at", "created_at"] as const, "created_at");
    rows = await paged(async (offset, limit) =>
      (await listVendorsTable({
        q: one(sp, "q"), status: pick(one(sp, "status"), E.vendor_status), cityId: uuidParam(sp, "city"), categoryId: uuidParam(sp, "category"),
        verified: flag(sp, "verified"), claim: pick(one(sp, "claim"), E.claim_status), noPrices: flag(sp, "no_prices") ?? false,
        noPhotos: flag(sp, "no_photos") ?? false, neverPosted: flag(sp, "never_posted") ?? false, sort, desc, limit, offset,
      })).rows,
    );
    columns = ["id", "name", "slug", "city", "area", "category", "status", "verified", "claim_status", "owner_username", "completeness", "official_updates_7d", "posts_7d", "open_reports", "has_prices", "has_photos", "never_posted", "last_activity_at", "created_at"];
  } else if (table === "users") {
    const { sort, desc } = sortOf(sp, ["created_at", "username", "trust_score", "points", "post_count", "last_seen_at"] as const, "created_at");
    rows = await paged(async (offset, limit) =>
      (await listUsers(session, { q: one(sp, "q"), role: pick(one(sp, "role"), USER_ROLES), status: pick(one(sp, "status"), E.profile_status), shadowbanned: flag(sp, "shadowbanned"), sort, desc, offset, limit })).rows,
    );
    // Data minimisation: IP addresses are never exported, even for super_admin.
    columns = ["id", "username", "display_name", "email", "email_verified", "role", "status", "is_shadowbanned", "trust_score", "points", "post_count", "last_seen_at", "created_at", "deleted_at"];
  } else if (table === "posts") {
    rows = (await paged(async (offset, limit) =>
      (await listPostsAdmin({ status: pick(one(sp, "status"), E.post_status), kind: pick(one(sp, "kind"), E.post_kind), reported: flag(sp, "reported"), offset, limit })).rows,
    )).map((r) => ({ ...r, vendor: r.vendor.name, author: r.author.username }));
    columns = ["id", "kind", "status", "hold_reason", "moderation_decision", "vendor", "author", "crowd_level", "body", "report_count", "like_count", "is_at_venue", "created_at"];
  } else if (table === "audit") {
    const admin = getAdminSupabase();
    let before: number | undefined;
    for (let i = 0; i < MAX_ROWS / 500; i++) {
      const { data } = await admin.rpc("admin_list_audit", { p_action_prefix: one(sp, "action"), p_entity_type: one(sp, "entity_type"), p_entity_id: one(sp, "entity_id"), p_actor_id: uuidParam(sp, "actor"), p_before_id: before, p_limit: 500 });
      const batch = data ?? [];
      rows.push(...batch.map((r) => ({ ...r, ip: undefined })));
      if (batch.length < 500) break;
      before = batch.at(-1)!.id;
    }
    columns = ["id", "at", "action", "actor_id", "actor_role", "entity_type", "entity_id", "reason", "before", "after"];
  } else {
    const { data } = await getAdminSupabase().rpc("admin_list_issue_reports", { p_limit: MAX_ROWS });
    rows = (data ?? []).map((r) => ({ ...r }));
    columns = ["id", "created_at", "category", "status", "city_name", "area_name", "has_location", "description", "internal_note", "handled_by_username"];
  }

  await writeAudit({
    action: `export.${table}`,
    entityType: "export",
    entityId: null,
    after: { rows: rows.length, filters: Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string")) as Record<string, string> },
    actorId: session.user.id,
    actorRole: session.profile.role,
    ...meta,
  });
  return { csv: toCsv(rows, columns), rows: rows.length };
}
