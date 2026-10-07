import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { assertServerOnly } from "@/lib/server-only";
import type { Actor } from "@/lib/services/admin/tasks";
import type { StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/notes");

/** Staff notes on any entity, stored as append-only audit entries (`note.added`). */
export async function addNote(session: SessionContext, entityType: string, entityId: string, text: string, meta: StaffMeta): Promise<void> {
  await addNoteAs({ id: session.user.id, role: session.profile.role }, entityType, entityId, text, meta);
}

export const NOTE_ENTITY_TYPES = ["public.vendors", "public.profiles", "public.events", "public.posts"] as const;

export async function addNoteAs(actor: Actor, entityType: string, entityId: string, text: string, meta: StaffMeta, auditAfter: Record<string, string> = {}): Promise<void> {
  const note = z.string().trim().min(2).max(2000).parse(text);
  z.enum(NOTE_ENTITY_TYPES).parse(entityType);
  z.uuid().parse(entityId);
  await writeAudit({ action: "note.added", entityType, entityId, after: { note, ...auditAfter }, reason: note, actorId: actor.id, actorRole: actor.role, ...meta });
}

export async function listNotes(entityType: string, entityId: string) {
  const { data } = await getAdminSupabase().rpc("admin_list_audit", { p_entity_type: entityType, p_entity_id: entityId, p_action_prefix: "note.", p_limit: 100 });
  return data ?? [];
}
