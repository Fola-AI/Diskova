import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { sendEmail } from "@/lib/email/send";
import { PostRemovedEmail } from "@/lib/email/templates/moderation";
import { computeHeuristics, type Heuristics } from "@/lib/moderation/heuristics";
import { MODERATION_ACTIONS, SEVERE_REASONS, trustAfter } from "@/lib/moderation/trust";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { awardForPost } from "@/lib/services/points";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/moderation");

const decisionSchema = z.object({
  itemId: z.uuid(),
  action: z.enum(MODERATION_ACTIONS),
  reason: z.string().trim().max(1000).optional().transform((v) => v || null),
  /** For removals: the report category that best describes it (drives the −25 trust penalty). */
  category: z.enum(["fake", "spam", "abuse", "dangerous", "wrong_venue", "rival_sabotage", "copyright", "other"]).optional(),
});

export interface QueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  priority: number;
  source: string;
  status: string;
  opened_at: string;
  post: {
    id: string;
    kind: string;
    body: string | null;
    crowd_level: number | null;
    status: string;
    hold_reason: string;
    moderation_decision: string | null;
    moderation_score: unknown;
    report_count: number;
    created_at: string;
    vendor: { id: string; slug: string; name: string } | null;
    author: { id: string; username: string; trust_score: number; created_at: string; status: string; post_count: number; is_shadowbanned: boolean } | null;
    media: Array<{ storage_path: string }>;
  } | null;
  reports: Array<{ reason: string; details: string | null }>;
  heuristics: Heuristics | null;
}

export async function listModerationQueue(opts: { source?: string; limit?: number } = {}): Promise<QueueItem[]> {
  const admin = getAdminSupabase();
  let q = admin
    .from("moderation_items")
    .select("id, entity_type, entity_id, priority, source, status, opened_at")
    .neq("status", "done")
    .order("priority")
    .order("opened_at")
    .limit(opts.limit ?? 50);
  if (opts.source) q = q.eq("source", opts.source as never);
  const { data: items, error } = await q;
  if (error) throw error;

  const postIds = (items ?? []).filter((i) => i.entity_type === "post").map((i) => i.entity_id);
  const [{ data: posts }, { data: reports }] = await Promise.all([
    postIds.length
      ? admin
          .from("posts")
          .select("id, kind, body, crowd_level, status, hold_reason, moderation_decision, moderation_score, report_count, created_at, vendor:vendors(id, slug, name), author:profiles!posts_author_id_fkey(id, username, trust_score, created_at, status, post_count, is_shadowbanned), media:post_media(storage_path)")
          .in("id", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length ? admin.from("reports").select("entity_id, reason, details").in("entity_id", postIds) : Promise.resolve({ data: [] }),
  ]);
  const postById = new Map(((posts ?? []) as unknown as NonNullable<QueueItem["post"]>[]).map((p) => [p.id, p]));
  return Promise.all(
    (items ?? []).map(async (i) => ({
      ...i,
      post: postById.get(i.entity_id) ?? null,
      reports: ((reports ?? []) as Array<{ entity_id: string; reason: string; details: string | null }>).filter((r) => r.entity_id === i.entity_id),
      heuristics: i.entity_type === "post" && postById.has(i.entity_id) ? await computeHeuristics(i.entity_id).catch(() => null) : null,
    })),
  );
}

async function closeItems(entityType: string, entityId: string, outcome: string): Promise<void> {
  await getAdminSupabase()
    .from("moderation_items")
    .update({ status: "done", closed_at: new Date().toISOString(), outcome })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .neq("status", "done");
}

/**
 * Apply a moderator decision to a queue item (posts; other entity types can be dismissed until L12).
 * Every outcome is audited with the moderator, reason and before/after.
 */
export async function decideModerationItem(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<void> {
  const input = decisionSchema.parse(raw);
  const admin = getAdminSupabase();
  const { data: item } = await admin.from("moderation_items").select("*").eq("id", input.itemId).single();
  if (!item || item.status === "done") throw new AdminActionError("This item was already handled.");
  const destructive = input.action.startsWith("remove") || input.action === "shadowban";
  if (destructive && !input.reason) throw new AdminActionError("A reason is required for this action.");

  if (input.action === "dismiss" || item.entity_type !== "post") {
    await closeItems(item.entity_type, item.entity_id, `dismissed${input.reason ? `: ${input.reason}` : ""}`);
    await writeAudit({ action: "moderation.dismiss", entityType: item.entity_type, entityId: item.entity_id, reason: input.reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
    return;
  }

  const { data: post } = await admin
    .from("posts")
    .select("id, author_id, vendor_id, kind, status, is_at_venue, created_at, moderation_decision, vendor:vendors(slug, name)")
    .eq("id", item.entity_id)
    .single();
  if (!post) throw new AdminActionError("Post not found.");
  const { data: author } = await admin.from("profiles").select("id, trust_score, username").eq("id", post.author_id).single();
  const { data: reports } = await admin.from("reports").select("reason").eq("entity_type", "post").eq("entity_id", post.id);
  const category = input.category ?? (reports ?? []).map((r) => r.reason).find((r) => (SEVERE_REASONS as readonly string[]).includes(r)) ?? null;
  const vendor = post.vendor as unknown as { slug: string; name: string } | null;
  const now = new Date().toISOString();
  const before = { status: post.status, moderation_decision: post.moderation_decision, trust: author?.trust_score };

  if (input.action === "approve" || input.action === "approve_verify") {
    const wasUnpublished = post.status !== "published";
    await admin
      .from("posts")
      .update({
        status: "published",
        hold_reason: "none",
        moderation_decision: "human_pass",
        moderated_by: session.user.id,
        moderated_at: now,
        ...(input.action === "approve_verify" ? { verified: true } : {}),
      })
      .eq("id", post.id);
    await admin.from("reports").update({ status: "resolved_kept", resolved_by: session.user.id, resolved_at: now }).eq("entity_type", "post").eq("entity_id", post.id).in("status", ["open", "reviewing"]);
    if (wasUnpublished) await awardForPost(post, { hasPhoto: true }).catch(() => 0); // held posts earn points on approval
  } else if (input.action === "shadowban") {
    await admin.from("user_sanctions").insert({ profile_id: post.author_id, kind: "shadowban", reason: input.reason!, issued_by: session.user.id });
  } else {
    // remove (+ optional sanction)
    await admin
      .from("posts")
      .update({ status: "removed", moderation_decision: "human_remove", moderated_by: session.user.id, moderated_at: now })
      .eq("id", post.id);
    await admin.from("reports").update({ status: "resolved_removed", resolved_by: session.user.id, resolved_at: now }).eq("entity_type", "post").eq("entity_id", post.id).in("status", ["open", "reviewing"]);
    const sanction =
      input.action === "remove_warn"
        ? { kind: "warning" as const, expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() }
        : input.action === "remove_suspend"
          ? { kind: "suspension" as const, expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() }
          : input.action === "remove_ban"
            ? { kind: "ban" as const, expires_at: null }
            : null;
    if (sanction) {
      await admin.from("user_sanctions").insert({ profile_id: post.author_id, kind: sanction.kind, reason: input.reason!, issued_by: session.user.id, expires_at: sanction.expires_at });
    }
    const { data: authUser } = await admin.auth.admin.getUserById(post.author_id);
    await sendEmail({
      to: authUser.user?.email,
      subject: "A post of yours was removed",
      react: PostRemovedEmail({
        vendorName: vendor?.name ?? null,
        reason: input.reason!,
        sanction:
          sanction?.kind === "warning" ? "This is a warning on your account."
          : sanction?.kind === "suspension" ? "Your account can't post for 7 days."
          : sanction?.kind === "ban" ? "Your account has been banned." : null,
      }),
    });
  }

  if (author && input.action !== "shadowban") {
    const trust = trustAfter(author.trust_score, input.action, category);
    if (trust !== author.trust_score) await admin.from("profiles").update({ trust_score: trust }).eq("id", author.id);
  }
  await closeItems("post", post.id, input.action);
  await writeAudit({
    action: `moderation.${input.action}`,
    entityType: "public.posts",
    entityId: post.id,
    before,
    after: { action: input.action, category, trust: author ? trustAfter(author.trust_score, input.action, category) : null },
    reason: input.reason,
    actorId: session.user.id,
    actorRole: session.profile.role,
    ...meta,
  });
  if (vendor) safeRevalidatePath(`/v/${vendor.slug}`);
}
