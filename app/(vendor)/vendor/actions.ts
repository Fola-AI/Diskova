"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { writeAudit } from "@/lib/admin-db/audit";
import { requireVendorMember, requireVerifiedUser } from "@/lib/auth/guards";
import { getPlatformSettings } from "@/lib/admin-db/settings";
import { adminRecipients, sendEmail } from "@/lib/email/send";
import { AdminVendorSubmittedEmail, VendorSubmittedEmail } from "@/lib/email/templates/vendor";
import { requestMeta } from "@/lib/http/request-meta";
import { createIncomingUpload, UploadError } from "@/lib/media/uploads";
import { createOfficialUpdate, OfficialUpdateError } from "@/lib/services/official-updates";
import { removeGalleryPhoto, VendorAssetError } from "@/lib/services/vendor-assets";
import {
  checkSubmission,
  createVendorDraft,
  getVendorForEditing,
  listMyVendors,
  savePrices,
  saveVendorStep,
  setCurrentVendorCookie,
  VendorError,
} from "@/lib/services/vendors";
import {
  createVerificationDocUpload,
  submitVerificationRequest,
  VerificationError,
} from "@/lib/services/verification";
import { fieldErrors } from "@/lib/validation/auth";
import type { VendorStep } from "@/lib/validation/vendor";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function fail(err: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  if (err instanceof ZodError) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(err) };
  if (err instanceof VendorError || err instanceof VendorAssetError || err instanceof OfficialUpdateError || err instanceof VerificationError || err instanceof UploadError) {
    return { ok: false, error: err.message };
  }
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Step 1: create the draft listing, then continue the wizard. */
export async function createVendorAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireVerifiedUser("/vendor/onboarding");
  try {
    const vendor = await createVendorDraft(session, input);
    return { ok: true, data: { id: vendor.id } };
  } catch (err) {
    return fail(err);
  }
}

/** Autosave for wizard steps (basics / contact / details). */
export async function saveVendorStepAction(vendorId: string, step: VendorStep, input: unknown): Promise<ActionResult> {
  const session = await requireVendorMember(vendorId, "manager");
  try {
    await saveVendorStep(session, vendorId, step, input);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function savePricesAction(vendorId: string, prices: unknown): Promise<ActionResult> {
  const session = await requireVendorMember(vendorId, "manager");
  try {
    await savePrices(session, vendorId, prices);
    const v = await getVendorForEditing(session, vendorId);
    revalidatePath(`/v/${v.slug}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function submitForReviewAction(vendorId: string): Promise<ActionResult> {
  const session = await requireVendorMember(vendorId, "manager");
  try {
    const vendor = await getVendorForEditing(session, vendorId);
    const check = checkSubmission(vendor);
    if (!check.ready) return { ok: false, error: `Still needed: ${check.missing.join(", ")}.` };
    if (!["draft", "rejected"].includes(vendor.status)) return { ok: false, error: "This listing is already submitted." };

    const { error } = await session.supabase.from("vendors").update({ status: "pending_review" }).eq("id", vendorId);
    if (error) return { ok: false, error: "We couldn't submit your listing. Please try again." };

    const { ip, userAgent } = await requestMeta();
    await writeAudit({
      action: "vendor.submitted",
      entityType: "public.vendors",
      entityId: vendorId,
      before: { status: vendor.status },
      after: { status: "pending_review" },
      actorId: session.user.id,
      actorRole: session.profile.role,
      ip,
      userAgent,
    });
    const settings = await getPlatformSettings();
    const city = (vendor.city as unknown as { name: string } | null)?.name ?? null;
    await Promise.all([
      sendEmail({
        to: session.user.email,
        subject: `${vendor.name} is in review`,
        react: VendorSubmittedEmail({ vendorName: vendor.name, notice: settings.monetisation_notice_md }),
      }),
      sendEmail({
        to: adminRecipients(),
        subject: `New vendor to review: ${vendor.name}`,
        react: AdminVendorSubmittedEmail({ vendorName: vendor.name, city }),
      }),
    ]);
    revalidatePath("/vendor");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Signed upload URL for ONE image (vendor photos or an official-update photo). */
export async function createVendorImageUploadAction(input: {
  vendorId: string;
  mime: string;
  size: number;
}): Promise<ActionResult<{ path: string; token: string }>> {
  const session = await requireVendorMember(String(input.vendorId));
  try {
    return { ok: true, data: await createIncomingUpload(session.user.id, String(input.mime), Number(input.size)) };
  } catch (err) {
    return fail(err);
  }
}

export async function removeGalleryPhotoAction(vendorId: string, path: string): Promise<ActionResult> {
  const session = await requireVendorMember(vendorId, "manager");
  try {
    await removeGalleryPhoto(session, vendorId, path);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function postOfficialUpdateAction(input: unknown): Promise<ActionResult<{ status: string; holdReason: string; slug: string }>> {
  const session = await requireVerifiedUser("/vendor/update");
  try {
    const { ip } = await requestMeta();
    const result = await createOfficialUpdate(session, input, { ip });
    revalidatePath(`/v/${result.vendorSlug}`);
    revalidatePath("/vendor");
    return { ok: true, data: { status: result.status, holdReason: result.holdReason, slug: result.vendorSlug } };
  } catch (err) {
    return fail(err);
  }
}

export async function switchVendorAction(formData: FormData): Promise<void> {
  const session = await requireVerifiedUser("/vendor");
  const vendorId = String(formData.get("vendorId") ?? "");
  const mine = await listMyVendors(session);
  if (mine.some((v) => v.id === vendorId)) await setCurrentVendorCookie(vendorId);
  redirect("/vendor");
}

export async function createVerificationDocUploadAction(input: {
  vendorId: string;
  mime: string;
  size: number;
}): Promise<ActionResult<{ path: string; token: string }>> {
  const session = await requireVerifiedUser("/vendor/verification");
  try {
    return { ok: true, data: await createVerificationDocUpload(session, String(input.vendorId), String(input.mime), Number(input.size)) };
  } catch (err) {
    return fail(err);
  }
}

export async function submitVerificationAction(input: unknown): Promise<ActionResult<{ isClaim: boolean }>> {
  const session = await requireVerifiedUser("/vendor/verification");
  try {
    const meta = await requestMeta();
    const res = await submitVerificationRequest(session, input, meta);
    revalidatePath("/vendor");
    return { ok: true, data: { isClaim: res.isClaim } };
  } catch (err) {
    return fail(err);
  }
}
