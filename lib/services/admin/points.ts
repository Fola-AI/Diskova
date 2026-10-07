import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { assertServerOnly } from "@/lib/server-only";
import { reasonSchema } from "@/lib/services/admin/common";
import { BADGES } from "@/lib/services/points";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/points");

const schema = z.object({
  username: z.string().trim().min(3).max(30),
  action: z.enum(["adjust", "reset", "grant_badge", "revoke_badge"]),
  points: z.coerce.number().int().min(-10000).max(10000).optional(),
  badge: z.enum(Object.values(BADGES) as [string, ...string[]]).optional(),
  reason: reasonSchema,
});

/** §11.13: adjust / reset points, grant / revoke badges. Every change is audited with a reason. */
export async function pointsAction(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<void> {
  const input = schema.parse(raw);
  const admin = getAdminSupabase();
  const { data: p } = await admin.from("profiles").select("id, points, badges").eq("username", input.username).maybeSingle();
  if (!p) throw new AdminActionError("No user with that username.");
  let after: { delta: number } | { badge: string } = { delta: 0 };
  if (input.action === "adjust" || input.action === "reset") {
    const delta = input.action === "reset" ? -p.points : input.points ?? 0;
    if (!delta) throw new AdminActionError("Nothing to change.");
    const { error } = await admin.from("point_events").insert({ profile_id: p.id, kind: "admin_adjustment", points: delta, ref_entity_type: "admin", ref_entity_id: session.user.id });
    if (error) throw new AdminActionError("Couldn't adjust points.");
    after = { delta };
  } else {
    if (!input.badge) throw new AdminActionError("Choose a badge.");
    const badges = new Set(p.badges);
    if (input.action === "grant_badge") badges.add(input.badge);
    else badges.delete(input.badge);
    const { error } = await admin.from("profiles").update({ badges: [...badges] }).eq("id", p.id);
    if (error) throw new AdminActionError("Couldn't update badges.");
    after = { badge: input.badge };
  }
  await writeAudit({ action: `points.${input.action}`, entityType: "public.profiles", entityId: p.id, before: { points: p.points, badges: p.badges }, after, reason: input.reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}
