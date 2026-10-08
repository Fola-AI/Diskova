import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { reasonSchema } from "@/lib/services/admin/common";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/qa");

type Kind = "question" | "answer";
const table = (k: Kind) => (k === "question" ? "qa_questions" : "qa_answers");

export async function listQaAdmin(f: { kind: Kind; status?: "pending" | "published" | "hidden" | "removed"; pinned?: boolean }) {
  const admin = getAdminSupabase();
  if (f.kind === "question") {
    let q = admin.from("qa_questions").select("id, title, body, status, moderation_decision, is_pinned, answer_count, report_count, created_at, author:profiles!qa_questions_author_id_fkey(username), vendor:vendors(slug, name), city:cities(slug, name)").is("deleted_at", null);
    if (f.status) q = q.eq("status", f.status);
    if (f.pinned) q = q.eq("is_pinned", true);
    const { data } = await q.order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  }
  let q = admin.from("qa_answers").select("id, body, status, moderation_decision, is_vendor_answer, is_official, vote_count, report_count, created_at, author:profiles!qa_answers_author_id_fkey(username), question:qa_questions!qa_answers_question_id_fkey(id, title)").is("deleted_at", null);
  if (f.status) q = q.eq("status", f.status);
  const { data } = await q.order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}

const actionSchema = z.object({ kind: z.enum(["question", "answer"]), id: z.uuid(), action: z.enum(["publish", "hide", "remove", "pin", "unpin"]), reason: z.string().optional() });

/** §11-style admin actions on Q&A. Hiding/removing needs a reason; everything is audited. */
export async function qaAdminAction(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<void> {
  const input = actionSchema.parse(raw);
  if ((input.action === "pin" || input.action === "unpin") && input.kind !== "question") throw new AdminActionError("Only questions can be pinned.");
  const reason = input.action === "hide" || input.action === "remove" ? reasonSchema.parse(input.reason ?? "") : input.reason?.trim() || null;
  const admin = getAdminSupabase();
  const pinPatch = input.action === "pin" || input.action === "unpin" ? { is_pinned: input.action === "pin" } : null;
  const statusPatch =
    input.action === "publish"
      ? { status: "published" as const, moderation_decision: "human_pass" as const }
      : { status: (input.action === "hide" ? "hidden" : "removed") as "hidden" | "removed", moderation_decision: "human_remove" as const };
  const patch = pinPatch ?? statusPatch;
  const { data: before, error } = pinPatch
    ? await admin.from("qa_questions").update(pinPatch).eq("id", input.id).select("status").single()
    : await admin.from(table(input.kind)).update(statusPatch).eq("id", input.id).select("status").single();
  if (error || !before) throw new AdminActionError("Not found.");
  if (input.action === "publish" || input.action === "hide" || input.action === "remove") {
    await admin.from("moderation_items").update({ status: "done", closed_at: new Date().toISOString(), outcome: input.action }).eq("entity_type", `qa_${input.kind}`).eq("entity_id", input.id).neq("status", "done");
  }
  await writeAudit({ action: `qa.${input.action}`, entityType: `public.${table(input.kind)}`, entityId: input.id, after: patch as never, reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath("/", "layout");
}

const seedSchema = z.object({
  cityId: z.uuid(),
  vendorId: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
  title: z.string().trim().min(10).max(140),
  body: z.string().trim().max(1000).optional().transform((v) => v || null),
  answer: z.string().trim().max(1000).optional().transform((v) => v || null),
});

/** "Pinned seeds": staff-written questions (optionally with an official answer) pinned to the top. */
export async function createPinnedSeed(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<string> {
  const input = seedSchema.parse(raw);
  const admin = getAdminSupabase();
  const { data: q, error } = await admin
    .from("qa_questions")
    .insert({ city_id: input.cityId, vendor_id: input.vendorId, title: input.title, body: input.body, author_id: session.user.id, status: "published", moderation_decision: "human_pass", is_pinned: true })
    .select("id")
    .single();
  if (error || !q) throw new AdminActionError("Couldn't create the question.");
  if (input.answer) {
    const { data: a } = await admin.from("qa_answers").insert({ question_id: q.id, body: input.answer, author_id: session.user.id, status: "published", moderation_decision: "human_pass", is_official: true }).select("id").single();
    if (a) await admin.from("qa_questions").update({ accepted_answer_id: a.id }).eq("id", q.id);
  }
  await writeAudit({ action: "qa.seed_created", entityType: "public.qa_questions", entityId: q.id, after: { title: input.title, with_answer: Boolean(input.answer) }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath("/", "layout");
  return q.id;
}

/** Moderation-queue decision for a Q&A item: approve publishes; remove (± sanction) removes. */
export async function decideQaItem(
  session: SessionContext,
  item: { entity_type: string; entity_id: string },
  input: { action: string; reason?: string | null },
  meta: StaffMeta,
): Promise<void> {
  const kind: Kind = item.entity_type === "qa_question" ? "question" : "answer";
  const admin = getAdminSupabase();
  const { data: row } = await admin.from(table(kind)).select("id, author_id, status").eq("id", item.entity_id).maybeSingle();
  if (!row) throw new AdminActionError("This question/answer no longer exists.");
  const now = new Date().toISOString();
  if (input.action === "approve" || input.action === "approve_verify") {
    await admin.from(table(kind)).update({ status: "published", moderation_decision: "human_pass" }).eq("id", row.id);
    await admin.from("reports").update({ status: "resolved_kept", resolved_by: session.user.id, resolved_at: now }).eq("entity_type", item.entity_type as never).eq("entity_id", row.id).in("status", ["open", "reviewing"]);
  } else if (input.action === "shadowban") {
    if (row.author_id) await admin.from("user_sanctions").insert({ profile_id: row.author_id, kind: "shadowban", reason: input.reason!, issued_by: session.user.id });
  } else {
    await admin.from(table(kind)).update({ status: "removed", moderation_decision: "human_remove" }).eq("id", row.id);
    await admin.from("reports").update({ status: "resolved_removed", resolved_by: session.user.id, resolved_at: now }).eq("entity_type", item.entity_type as never).eq("entity_id", row.id).in("status", ["open", "reviewing"]);
    const sanction =
      input.action === "remove_warn" ? { kind: "warning" as const, expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() }
      : input.action === "remove_suspend" ? { kind: "suspension" as const, expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() }
      : input.action === "remove_ban" ? { kind: "ban" as const, expires_at: null } : null;
    if (sanction && row.author_id) await admin.from("user_sanctions").insert({ profile_id: row.author_id, kind: sanction.kind, reason: input.reason!, issued_by: session.user.id, expires_at: sanction.expires_at });
  }
  await admin.from("moderation_items").update({ status: "done", closed_at: now, outcome: input.action }).eq("entity_type", item.entity_type).eq("entity_id", row.id).neq("status", "done");
  await writeAudit({ action: `moderation.${input.action}`, entityType: `public.${table(kind)}`, entityId: row.id, before: { status: row.status }, after: { action: input.action }, reason: input.reason ?? null, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath("/", "layout");
}
