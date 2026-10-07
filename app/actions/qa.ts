"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { getSession, type SessionContext } from "@/lib/auth/guards";
import { acceptAnswer, answerQuestion, askQuestion, deleteOwn, myVotes, QaError, toggleVote } from "@/lib/services/qa";

type Failure = { ok: false; error: string; needsLogin?: boolean };
export type QaResult<T = object> = ({ ok: true } & T) | Failure;

async function session(): Promise<SessionContext | Failure> {
  const s = await getSession();
  return s ?? { ok: false, error: "Sign in to take part.", needsLogin: true };
}
const isSession = (s: SessionContext | Failure): s is SessionContext => "user" in s;

function fail(err: unknown): Failure {
  if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? "Please check your input." };
  if (err instanceof QaError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

function refresh(path?: string) {
  if (path && path.startsWith("/")) revalidatePath(path);
}

export async function askQuestionAction(input: { vendorId?: string; cityId?: string; title: string; body?: string; path?: string }): Promise<QaResult<{ id: string; status: string }>> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    const r = await askQuestion(s, input);
    refresh(input.path);
    return { ok: true, ...r };
  } catch (err) {
    return fail(err);
  }
}

export async function answerQuestionAction(input: { questionId: string; body: string; path?: string }): Promise<QaResult<{ id: string; status: string }>> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    const r = await answerQuestion(s, input);
    refresh(input.path);
    refresh(`/q/${input.questionId}`);
    return { ok: true, ...r };
  } catch (err) {
    return fail(err);
  }
}

export async function voteAction(answerId: string): Promise<QaResult<{ voted: boolean; count: number }>> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    return { ok: true, ...(await toggleVote(s, answerId)) };
  } catch (err) {
    return fail(err);
  }
}

export async function acceptAnswerAction(input: { questionId: string; answerId: string | null; path?: string }): Promise<QaResult> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    await acceptAnswer(s, input.questionId, input.answerId);
    refresh(input.path);
    refresh(`/q/${input.questionId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteQaAction(input: { kind: "question" | "answer"; id: string; path?: string }): Promise<QaResult> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    await deleteOwn(s, input.kind, input.id);
    refresh(input.path);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** After hydration: who is viewing (to show "accept" on their own questions) and which answers they upvoted. */
export async function myQaStateAction(answerIds: string[]): Promise<{ userId: string | null; voted: string[] }> {
  const s = await getSession();
  if (!s) return { userId: null, voted: [] };
  return { userId: s.user.id, voted: await myVotes(s, answerIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id))) };
}
