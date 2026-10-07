"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { createIncomingUpload, UploadError } from "@/lib/media/uploads";
import { restoreRevision, saveGuide, setGuideStatus } from "@/lib/services/admin/content";
import { AdminActionError } from "@/lib/services/admin/vendors";
import { fieldErrors } from "@/lib/validation/auth";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function fail(err: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  if (err instanceof ZodError) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(err) };
  if (err instanceof AdminActionError || err instanceof UploadError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong." };
}

export async function saveGuideAction(id: string | null, input: unknown): Promise<Result<{ id: string; slug: string }>> {
  const session = await requireRole("admin", "/admin/content");
  try {
    const res = await saveGuide(session, id, input, await requestMeta());
    revalidatePath("/admin/content");
    return { ok: true, ...res };
  } catch (err) {
    return fail(err);
  }
}

export async function setGuideStatusAction(id: string, status: "draft" | "review" | "published" | "archived"): Promise<Result> {
  const session = await requireRole("admin", "/admin/content");
  try {
    await setGuideStatus(session, id, status, await requestMeta());
    revalidatePath(`/admin/content/${id}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function restoreRevisionAction(id: string, revisionId: string): Promise<Result> {
  const session = await requireRole("admin", "/admin/content");
  try {
    await restoreRevision(session, id, revisionId, await requestMeta());
    revalidatePath(`/admin/content/${id}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createGuideCoverUploadAction(input: { mime: string; size: number }): Promise<{ ok: true; data: { path: string; token: string } } | { ok: false; error: string }> {
  const session = await requireRole("admin", "/admin/content");
  try {
    return { ok: true, data: await createIncomingUpload(session.user.id, String(input.mime), Number(input.size)) };
  } catch (err) {
    return fail(err);
  }
}
