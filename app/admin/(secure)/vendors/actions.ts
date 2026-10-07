"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { AdminActionError, decideVendor, decideVerification } from "@/lib/services/admin/vendors";
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
