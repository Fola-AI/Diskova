import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { assertServerOnly } from "@/lib/server-only";
import type { StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/notes");

/** Staff notes on any entity, stored as append-only audit entries (`note.added`). */
export async function addNote(session: SessionContext, entityType: string, entityId: string, text: string, meta: StaffMeta): Promise<void> {
  const note = z.string().trim().min(2).max(2000).parse(text);
  await writeAudit({ action: "note.added", entityType, entityId, after: { note }, reason: note, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}

export async function listNotes(entityType: string, entityId: string) {
  const { data } = await getAdminSupabase().rpc("admin_list_audit", { p_entity_type: entityType, p_entity_id: entityId, p_action_prefix: "note.", p_limit: 100 });
  return data ?? [];
}
