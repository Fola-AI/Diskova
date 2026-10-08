"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { getSession, type SessionContext } from "@/lib/auth/guards";
import { clientIpFrom } from "@/lib/http/request-meta";
import { addToList, countListView, createList, deleteList, ListError, listMyLists, removeFromList, updateItem, updateList, type MyListSummary } from "@/lib/services/lists";
import { headers } from "next/headers";

type ListFailure = { ok: false; error: string; needsLogin?: boolean; needsVerify?: boolean };
export type ListResult<T = object> = ({ ok: true } & T) | ListFailure;

async function session(): Promise<SessionContext | ListFailure> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Sign in to save places.", needsLogin: true };
  if (!s.profile.email_verified_at) return { ok: false, error: "Confirm your email to save lists.", needsVerify: true };
  return s;
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? "Please check your input." };
  if (err instanceof ListError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

const isSession = (s: SessionContext | ListFailure): s is SessionContext => "user" in s;

function revalidateList(token?: string) {
  revalidatePath("/me/lists", "layout");
  if (token) revalidatePath(`/l/${token}`);
}

export async function myListsAction(contains: { vendorId?: string; eventId?: string }): Promise<ListResult<{ lists: MyListSummary[] }>> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    return { ok: true, lists: await listMyLists(s, contains) };
  } catch (err) {
    return fail(err);
  }
}

export async function addToListAction(input: { listId?: string; newListTitle?: string; vendorId?: string; eventId?: string; cityId?: string | null }): Promise<ListResult<{ listId: string }>> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    const r = await addToList(s, input);
    revalidateList();
    return { ok: true, ...r };
  } catch (err) {
    return fail(err);
  }
}

export async function removeFromListAction(input: { listId: string; vendorId?: string; eventId?: string; itemId?: string; token?: string }): Promise<ListResult> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    await removeFromList(s, input.listId, input);
    revalidateList(input.token);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createListAction(input: { title: string; cityId?: string | null }): Promise<ListResult<{ id: string }>> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    const r = await createList(s, input);
    revalidateList();
    return { ok: true, id: r.id };
  } catch (err) {
    return fail(err);
  }
}

export async function updateListAction(input: { listId: string; title?: string; isPublic?: boolean; token?: string }): Promise<ListResult> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    await updateList(s, input);
    revalidateList(input.token);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateItemAction(input: { itemId: string; note?: string; move?: "up" | "down"; token?: string }): Promise<ListResult> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    await updateItem(s, input);
    revalidateList(input.token);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteListAction(input: { listId: string; token?: string }): Promise<ListResult> {
  const s = await session();
  if (!isSession(s)) return s;
  try {
    await deleteList(s, input.listId);
    revalidateList(input.token);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Anonymous: count a share-page view (rate-limited per IP per list). */
export async function countListViewAction(token: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{12}$/.test(token)) return;
  await countListView(token, clientIpFrom(await headers())).catch(() => undefined);
}
