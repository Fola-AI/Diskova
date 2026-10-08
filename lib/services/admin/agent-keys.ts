import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { assertServerOnly } from "@/lib/server-only";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/agent-keys");

export const AGENT_SCOPES = ["read", "tasks:write", "notes:write", "pii:read"] as const;
export type AgentScope = (typeof AGENT_SCOPES)[number];

export function hashAgentKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

const cidr = z.string().trim().refine((v) => /^(\d{1,3}(\.\d{1,3}){3})(\/(\d|[12]\d|3[0-2]))?$/.test(v) || /^[0-9a-fA-F:]{2,39}(\/(\d{1,2}|1[01]\d|12[0-8]))?$/.test(v), "Use an IP address or CIDR, e.g. 102.89.0.0/16");

export const createKeySchema = z.object({
  name: z.string().trim().min(2).max(80),
  // "read" is always granted (its checkbox is disabled in the UI, so browsers don't submit it).
  scopes: z.array(z.enum(AGENT_SCOPES)).default([]).transform((s) => [...new Set(["read", ...s])] as AgentScope[]),
  ipAllowlist: z.array(cidr).max(20).default([]),
  expiresInDays: z.coerce.number().int().min(1).max(365).default(90),
});

/** §12: super_admin only. Returns the plaintext key ONCE; only its sha256 and prefix are stored. */
export async function createAgentKey(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<{ id: string; key: string; prefix: string; expiresAt: string }> {
  if (session.profile.role !== "super_admin") throw new AdminActionError("Only a super admin can create agent keys.");
  const input = createKeySchema.parse(raw);
  const prefix = `dk_${randomBytes(4).toString("hex")}`;
  const key = `${prefix}_${randomBytes(24).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
  const { data, error } = await getAdminSupabase().rpc("admin_create_agent_key", {
    p_name: input.name, p_key_hash: hashAgentKey(key), p_key_prefix: prefix, p_scopes: input.scopes,
    p_ip_allowlist: input.ipAllowlist, p_expires_at: expiresAt, p_created_by: session.user.id,
  });
  if (error || !data) throw new AdminActionError(/cidr|inet/i.test(error?.message ?? "") ? "One of the IP allowlist entries isn't a valid IP/CIDR." : "Couldn't create the key.");
  await writeAudit({ action: "agent_key.created", entityType: "private.agent_api_keys", entityId: data, after: { name: input.name, prefix, scopes: input.scopes, ip_allowlist: input.ipAllowlist, expires_at: expiresAt }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  return { id: data, key, prefix, expiresAt };
}

export async function listAgentKeys() {
  const { data } = await getAdminSupabase().rpc("admin_list_agent_keys");
  return data ?? [];
}

export async function revokeAgentKey(session: SessionContext, id: string, meta: StaffMeta): Promise<void> {
  if (session.profile.role !== "super_admin") throw new AdminActionError("Only a super admin can revoke agent keys.");
  const { data } = await getAdminSupabase().rpc("admin_revoke_agent_key", { p_id: z.uuid().parse(id) });
  if (!data) throw new AdminActionError("That key is already revoked or doesn't exist.");
  await writeAudit({ action: "agent_key.revoked", entityType: "private.agent_api_keys", entityId: id, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}
