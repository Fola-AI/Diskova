import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { getPlatformSettings, moderationSettings } from "@/lib/admin-db/settings";
import { getPublicSupabase } from "@/lib/db/public";
import { maxScore, moderateText } from "@/lib/moderation/text";
import { rateLimit, retryAfterText, type LimitName } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/qa");

/**
 * Community Q&A (PRD P3). Users write through their own client (RLS: verified, own rows, pending);
 * the server then applies the same text moderation as posts and publishes, publishes-and-flags, or
 * hides — with a moderation queue item for anything not auto-passed.
 */
export class QaError extends Error {}

export const questionSchema = z
  .object({
    vendorId: z.uuid().optional(),
    cityId: z.uuid().optional(),
    title: z.string().trim().min(10, "Make the question at least 10 characters.").max(140),
    body: z.string().trim().max(1000).optional().transform((v) => v || null),
  })
  .refine((v) => v.vendorId || v.cityId, "Ask about a venue or a city.");
export const answerSchema = z.object({ questionId: z.uuid(), body: z.string().trim().min(2, "Write an answer.").max(1000) });

async function limit(name: LimitName, userId: string, what: string) {
  const rl = await rateLimit(name, userId);
  if (!rl.ok) throw new QaError(`You've ${what} a lot recently. Try again in ${retryAfterText(rl.reset)}.`);
}

function canWrite(session: SessionContext) {
  if (!session.profile.email_verified_at) throw new QaError("Confirm your email first.");
  if (session.profile.status === "suspended" || session.profile.status === "banned") throw new QaError("Your account can't post right now.");
}

/** Moderate and publish/hide a freshly inserted row. Returns the resulting status. */
async function moderate(table: "qa_questions" | "qa_answers", id: string, text: string): Promise<"published" | "hidden"> {
  const settings = await getPlatformSettings();
  const ms = moderationSettings(settings);
  const result = await moderateText(text, { blocklist: settings.blocklist_phrases });
  const score = result.available ? maxScore(result) : ms.autoFlagThreshold; // couldn't check → human review
  const decision = score >= ms.autoBlockThreshold ? "auto_block" : score >= ms.autoFlagThreshold ? "auto_flag" : "auto_pass";
  const status = decision === "auto_block" ? "hidden" : "published";
  const admin = getAdminSupabase();
  await admin.from(table).update({ status, moderation_decision: decision, moderation_score: result.scores as never }).eq("id", id);
  if (decision !== "auto_pass") {
    await admin.from("moderation_items").insert({ entity_type: table === "qa_questions" ? "qa_question" : "qa_answer", entity_id: id, priority: decision === "auto_block" ? 1 : 3, source: decision });
  }
  return status;
}

export async function askQuestion(session: SessionContext, raw: unknown): Promise<{ id: string; status: "published" | "hidden" }> {
  canWrite(session);
  const input = questionSchema.parse(raw);
  await limit("qaAskUser", session.user.id, "asked");
  let cityId = input.cityId ?? null;
  if (input.vendorId && !cityId) {
    const { data: v } = await getPublicSupabase().from("vendors").select("city_id").eq("id", input.vendorId).maybeSingle();
    if (!v) throw new QaError("That venue isn't available.");
    cityId = v.city_id;
  }
  const { data, error } = await session.supabase.from("qa_questions").insert({ vendor_id: input.vendorId ?? null, city_id: cityId!, title: input.title, body: input.body }).select("id").single();
  if (error || !data) throw new QaError("Couldn't post your question.");
  return { id: data.id, status: await moderate("qa_questions", data.id, [input.title, input.body].filter(Boolean).join("\n")) };
}

export async function answerQuestion(session: SessionContext, raw: unknown): Promise<{ id: string; status: "published" | "hidden" }> {
  canWrite(session);
  const input = answerSchema.parse(raw);
  await limit("qaAnswerUser", session.user.id, "answered");
  const { data, error } = await session.supabase.from("qa_answers").insert({ question_id: input.questionId, body: input.body }).select("id").single();
  if (error || !data) throw new QaError("Couldn't post your answer.");
  return { id: data.id, status: await moderate("qa_answers", data.id, input.body) };
}

/** Upvote toggle (no downvotes). You can't vote for your own answer (RLS). */
export async function toggleVote(session: SessionContext, answerId: string): Promise<{ voted: boolean; count: number }> {
  canWrite(session);
  const id = z.uuid().parse(answerId);
  await limit("qaVoteUser", session.user.id, "voted");
  const { data: existing } = await session.supabase.from("qa_votes").select("answer_id").eq("answer_id", id).maybeSingle();
  if (existing) await session.supabase.from("qa_votes").delete().eq("answer_id", id);
  else {
    const { error } = await session.supabase.from("qa_votes").insert({ answer_id: id });
    if (error) throw new QaError("You can't vote on that answer.");
  }
  const { data } = await getPublicSupabase().from("qa_answers").select("vote_count").eq("id", id).maybeSingle();
  return { voted: !existing, count: data?.vote_count ?? 0 };
}

/** The asker marks the answer that helped (or clears it). */
export async function acceptAnswer(session: SessionContext, questionId: string, answerId: string | null): Promise<void> {
  const { data, error } = await session.supabase
    .from("qa_questions")
    .update({ accepted_answer_id: answerId ? z.uuid().parse(answerId) : null })
    .eq("id", z.uuid().parse(questionId))
    .select("id");
  if (error || !data?.length) throw new QaError("Only the person who asked can accept an answer.");
}

export async function deleteOwn(session: SessionContext, kind: "question" | "answer", id: string): Promise<void> {
  const { data, error } = await session.supabase
    .from(kind === "question" ? "qa_questions" : "qa_answers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", z.uuid().parse(id))
    .select("id");
  if (error || !data?.length) throw new QaError("Couldn't delete that.");
}

export async function myVotes(session: SessionContext, answerIds: string[]): Promise<string[]> {
  if (!answerIds.length) return [];
  const { data } = await session.supabase.from("qa_votes").select("answer_id").in("answer_id", answerIds.slice(0, 200));
  return (data ?? []).map((v) => v.answer_id);
}

// ------------------------------------------------------------------------------------------- reads

export interface QaAnswer { id: string; body: string; author: { username: string; display_name: string | null } | null; is_vendor_answer: boolean; is_official: boolean; vote_count: number; created_at: string; author_id: string | null }
export interface QaQuestion {
  id: string; vendor_id: string | null; city_id: string; title: string; body: string | null; is_pinned: boolean; accepted_answer_id: string | null; answer_count: number; created_at: string; author_id: string | null;
  author: { username: string; display_name: string | null } | null; vendor: { slug: string; name: string } | null; city: { slug: string; name: string } | null; answers: QaAnswer[];
}

const Q_SELECT =
  "id, vendor_id, city_id, title, body, is_pinned, accepted_answer_id, answer_count, created_at, author_id, author:profiles!qa_questions_author_id_fkey(username, display_name), vendor:vendors(slug, name), city:cities(slug, name), answers:qa_answers!qa_answers_question_id_fkey(id, body, is_vendor_answer, is_official, vote_count, created_at, author_id, author:profiles!qa_answers_author_id_fkey(username, display_name))";

function sortAnswers(q: QaQuestion): QaQuestion {
  const rank = (a: QaAnswer) => (a.id === q.accepted_answer_id ? 3 : a.is_official ? 2 : a.is_vendor_answer ? 1 : 0);
  return { ...q, answers: [...q.answers].sort((a, b) => rank(b) - rank(a) || b.vote_count - a.vote_count || a.created_at.localeCompare(b.created_at)) };
}

/** Public (anon RLS) questions for a venue or a city: pinned first, then newest. */
export async function listQuestions(scope: { vendorId?: string; cityId?: string; cityOnly?: boolean }, max = 20): Promise<QaQuestion[]> {
  let q = getPublicSupabase().from("qa_questions").select(Q_SELECT);
  if (scope.vendorId) q = q.eq("vendor_id", scope.vendorId);
  if (scope.cityId) q = q.eq("city_id", scope.cityId);
  if (scope.cityOnly) q = q.is("vendor_id", null);
  const { data, error } = await q.order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(max);
  if (error) throw error;
  return ((data ?? []) as unknown as QaQuestion[]).map(sortAnswers);
}

export async function getQuestion(id: string): Promise<QaQuestion | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await getPublicSupabase().from("qa_questions").select(Q_SELECT).eq("id", id).maybeSingle();
  return data ? sortAnswers(data as unknown as QaQuestion) : null;
}
