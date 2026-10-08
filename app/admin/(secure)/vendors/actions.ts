"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { toFormState } from "@/lib/admin/form-state";
import { addNote } from "@/lib/services/admin/notes";
import { AdminActionError, adminEditVendor, bulkVendorAction, decideVendor, decideVerification, vendorAdminAction } from "@/lib/services/admin/vendors";
import type { FormState } from "@/components/forms/form-state";

function toState(err: unknown): FormState {
  if (err instanceof ZodError) return { error: err.issues[0]?.message ?? "Invalid input." };
  if (err instanceof AdminActionError) return { error: err.message };
  console.error(err);
  return { error: "Action failed." };
}

export async function decideVendorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/vendors");
  const decision = formData.get("decision") === "approve" ? "approve" : "reject";
  try {
    await decideVendor(session, String(formData.get("vendorId")), decision, String(formData.get("reason") ?? "") || null, await requestMeta());
  } catch (err) {
    return toState(err);
  }
  revalidatePath("/admin/vendors");
  return { ok: true, message: decision === "approve" ? "Approved and published." : "Rejected." };
}

export async function decideVerificationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/vendors");
  const decision = formData.get("decision") === "approve" ? "approve" : "reject";
  try {
    await decideVerification(session, String(formData.get("requestId")), decision, String(formData.get("reason") ?? "") || null, await requestMeta());
  } catch (err) {
    return toState(err);
  }
  revalidatePath("/admin/vendors");
  return { ok: true, message: decision === "approve" ? "Approved." : "Rejected." };
}

const ADMIN_VENDOR_ACTIONS = ["verify", "unverify", "suspend", "unsuspend", "approve", "reject"] as const;

export async function vendorRowAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/vendors");
  const action = ADMIN_VENDOR_ACTIONS.find((a) => a === formData.get("action"));
  if (!action) return { error: "Unknown action." };
  const vendorId = String(formData.get("vendorId") ?? "");
  try {
    await vendorAdminAction(session, vendorId, action, String(formData.get("reason") ?? "") || null, await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
  return { ok: true, message: `Done: ${action}.` };
}

export async function bulkVendorFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/vendors");
  const action = formData.get("action") === "approve" ? "approve" : formData.get("action") === "suspend" ? "suspend" : null;
  const ids = formData.getAll("ids").map(String).filter((s) => /^[0-9a-f-]{36}$/i.test(s));
  if (!action) return { error: "Unknown action." };
  if (!ids.length) return { error: "Select at least one vendor." };
  const reason = String(formData.get("reason") ?? "").trim();
  if (action === "suspend" && reason.length < 5) return { error: "Give a reason (at least 5 characters)." };
  const { done, failed } = await bulkVendorAction(session, ids, action, reason || null, await requestMeta());
  revalidatePath("/admin/vendors");
  return failed ? { error: `${done} done, ${failed} failed (check status — e.g. only pending vendors can be approved).` } : { ok: true, message: `${done} vendor(s) updated.` };
}

export async function vendorEditAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/vendors");
  const vendorId = String(formData.get("vendorId") ?? "");
  try {
    await adminEditVendor(session, vendorId, Object.fromEntries(formData), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath(`/admin/vendors/${vendorId}`);
  return { ok: true, message: "Saved." };
}

export async function addNoteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("moderator", "/admin");
  const entityType = String(formData.get("entityType") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  if (!["public.vendors", "public.profiles", "public.events", "public.posts"].includes(entityType) || !/^[0-9a-f-]{36}$/i.test(entityId)) return { error: "Invalid target." };
  try {
    await addNote(session, entityType, entityId, String(formData.get("note") ?? ""), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  const back = String(formData.get("back") ?? "");
  if (back.startsWith("/admin/")) revalidatePath(back);
  return { ok: true, message: "Note added." };
}
