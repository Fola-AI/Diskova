import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import type { Database } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";
import { PAGE_SIZE, reasonSchema } from "@/lib/services/admin/common";
import type { StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/posts");

type Enums = Database["public"]["Enums"];
export interface PostFilters {
  status?: Enums["post_status"];
  kind?: Enums["post_kind"];
  hold?: Enums["hold_reason"];
  decision?: Enums["moderation_decision"];
  vendor?: string;
  author?: string;
  since?: string;
  reported?: boolean;
  sort?: string;
  desc?: boolean;
  offset?: number;
  limit?: number;
}

/** §11.5: every post in every status, with filters. */
export async function listPostsAdmin(f: PostFilters) {
  const admin = getAdminSupabase();
  let q = admin
    .from("posts")
    .select("id, kind, status, hold_reason, moderation_decision, crowd_level, body, report_count, like_count, is_at_venue, created_at, deleted_at, vendor:vendors!inner(slug, name), author:profiles!posts_author_id_fkey!inner(username, trust_score)", { count: "exact" });
  if (f.status) q = q.eq("status", f.status);
  if (f.kind) q = q.eq("kind", f.kind);
  if (f.hold) q = q.eq("hold_reason", f.hold);
  if (f.decision) q = q.eq("moderation_decision", f.decision);
  if (f.vendor) q = q.ilike("vendor.name", `%${f.vendor.replace(/[%_\\]/g, "")}%`);
  if (f.author) q = q.ilike("author.username", `%${f.author.replace(/[%_\\]/g, "")}%`);
  if (f.since) q = q.gte("created_at", f.since);
  if (f.reported) q = q.gt("report_count", 0);
  const sortable = ["created_at", "report_count", "like_count", "crowd_level"];
  const { data, count, error } = await q
    .order(sortable.includes(f.sort ?? "") ? f.sort! : "created_at", { ascending: !(f.desc ?? true) })
    .range(f.offset ?? 0, (f.offset ?? 0) + (f.limit ?? PAGE_SIZE) - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

const bulkSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200), action: z.enum(["hide", "remove"]), reason: reasonSchema });

export async function bulkPostAction(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<number> {
  const input = bulkSchema.parse(raw);
  const status = input.action === "hide" ? "hidden" : "removed";
  const { data, error } = await getAdminSupabase()
    .from("posts")
    .update({ status, moderation_decision: "human_remove", moderated_by: session.user.id, moderated_at: new Date().toISOString() })
    .in("id", input.ids)
    .select("id");
  if (error) throw error;
  await writeAudit({ action: `post.bulk_${input.action}`, entityType: "public.posts", entityId: null, after: { ids: input.ids, status }, reason: input.reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  return data?.length ?? 0;
}
