"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { getSession, type SessionContext } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { createIncomingUpload, UploadError } from "@/lib/media/uploads";
import { createCheckin, createPulse, finalizeCheckin, likedPostIds, PostError, toggleLike } from "@/lib/services/posts";
import { ReportError, reportContent } from "@/lib/services/reports";

export type PostActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; needsLogin?: boolean; needsVerify?: boolean };

async function verifiedSession(): Promise<SessionContext | PostActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to post.", needsLogin: true };
  if (!session.profile.email_verified_at) return { ok: false, error: "Confirm your email to post.", needsVerify: true };
  if (["suspended", "banned"].includes(session.profile.status)) {
    return { ok: false, error: "Your account can't post right now." };
  }
  return session;
}

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? "Please check your input." };
  if (err instanceof PostError || err instanceof ReportError || err instanceof UploadError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

function isSession(v: SessionContext | PostActionResult): v is SessionContext {
  return "user" in v;
}

export async function pulseAction(input: { vendorId: string; vendorSlug: string; crowdLevel: number; lat?: number | null; lng?: number | null }): Promise<PostActionResult<{ points: number; isAtVenue: boolean }>> {
  const s = await verifiedSession();
  if (!isSession(s)) return s as PostActionResult<{ points: number; isAtVenue: boolean }>;
  try {
    const { ip } = await requestMeta();
    const res = await createPulse(s, input, { ip });
    revalidatePath(`/v/${input.vendorSlug}`);
    return { ok: true, points: res.points, isAtVenue: res.isAtVenue };
  } catch (err) {
    return fail(err);
  }
}

export async function createCheckinAction(input: unknown): Promise<PostActionResult<{ postId: string }>> {
  const s = await verifiedSession();
  if (!isSession(s)) return s as PostActionResult<{ postId: string }>;
  try {
    const { ip } = await requestMeta();
    return { ok: true, ...(await createCheckin(s, input, { ip })) };
  } catch (err) {
    return fail(err);
  }
}

export async function createPostPhotoUploadAction(input: { mime: string; size: number }): Promise<{ ok: true; data: { path: string; token: string } } | { ok: false; error: string }> {
  const s = await verifiedSession();
  if (!isSession(s)) return { ok: false, error: (s as { error: string }).error };
  try {
    return { ok: true, data: await createIncomingUpload(s.user.id, String(input.mime), Number(input.size)) };
  } catch (err) {
    return fail(err);
  }
}

export async function finalizeCheckinAction(postId: string, vendorSlug: string): Promise<PostActionResult<{ status: string; holdReason: string; points: number }>> {
  const s = await verifiedSession();
  if (!isSession(s)) return s as PostActionResult<{ status: string; holdReason: string; points: number }>;
  try {
    const res = await finalizeCheckin(s, String(postId));
    revalidatePath(`/v/${vendorSlug}`);
    revalidatePath("/me/posts");
    return { ok: true, status: res.status, holdReason: res.holdReason, points: res.points };
  } catch (err) {
    return fail(err);
  }
}

export async function toggleLikeAction(postId: string): Promise<PostActionResult<{ liked: boolean; count: number }>> {
  const s = await verifiedSession();
  if (!isSession(s)) return s as PostActionResult<{ liked: boolean; count: number }>;
  try {
    return { ok: true, ...(await toggleLike(s, String(postId))) };
  } catch (err) {
    return fail(err);
  }
}

export async function myLikesAction(postIds: string[]): Promise<string[]> {
  const s = await getSession();
  if (!s) return [];
  try {
    return await likedPostIds(s, postIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50));
  } catch {
    return [];
  }
}

export async function reportAction(input: unknown): Promise<PostActionResult> {
  const s = await verifiedSession();
  if (!isSession(s)) return s;
  try {
    await reportContent(s, input);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteMyPostAction(postId: string): Promise<PostActionResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Sign in first.", needsLogin: true };
  const { data, error } = await s.supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", String(postId))
    .eq("author_id", s.user.id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Couldn't delete that post." };
  revalidatePath("/me/posts");
  return { ok: true };
}
