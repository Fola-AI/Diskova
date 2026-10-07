import { getAdminSupabase } from "@/lib/admin-db/client";
import type { Json } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/admin-db/audit");

export interface AuditEntry {
  /** Dotted verb, e.g. "vendor.approved", "moderation.remove". */
  action: string;
  entityType: string;
  entityId: string | null;
  before?: Json;
  after?: Json;
  /** Required by policy for destructive actions (PRD §11). */
  reason?: string;
  actorId?: string | null;
  actorRole?: string;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append to private.audit_log (§6.14, §7.9). Every privileged Server Action calls this.
 * Throws if the write fails — a privileged action must not succeed silently without its audit row.
 */
export async function writeAudit(entry: AuditEntry): Promise<number> {
  const { data, error } = await getAdminSupabase().rpc("admin_write_audit", {
    p_action: entry.action,
    p_entity_type: entry.entityType,
    p_entity_id: entry.entityId ?? "",
    p_before: entry.before ?? null,
    p_after: entry.after ?? null,
    p_reason: entry.reason ?? undefined,
    p_actor_id: entry.actorId ?? undefined,
    p_actor_role: entry.actorRole ?? undefined,
    p_ip: entry.ip ?? undefined,
    p_user_agent: entry.userAgent ?? undefined,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
  return data;
}
