import { nanoid } from "nanoid";
import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { adminRecipients, sendEmail } from "@/lib/email/send";
import { AdminVendorSubmittedEmail } from "@/lib/email/templates/vendor";
import { safeExternalUrl } from "@/lib/directory/links";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/verification");

export const DOCS_BUCKET = "verification-docs";
const DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_DOC_BYTES = 10 * 1024 * 1024;

export class VerificationError extends Error {}

/**
 * Who may submit: an accepted member (verification) OR anyone verified, for an UNCLAIMED vendor (claim).
 */
async function assertCanRequest(session: SessionContext, vendorId: string): Promise<{ isClaim: boolean; vendorName: string }> {
  if (!session.profile.email_verified_at || ["suspended", "banned"].includes(session.profile.status)) {
    throw new VerificationError("Confirm your email before submitting.");
  }
  const admin = getAdminSupabase();
  const [{ data: vendor }, { data: member }] = await Promise.all([
    admin.from("vendors").select("name, claim_status, deleted_at, status").eq("id", vendorId).maybeSingle(),
    admin.from("vendor_members").select("accepted_at").eq("vendor_id", vendorId).eq("profile_id", session.user.id).maybeSingle(),
  ]);
  if (!vendor || vendor.deleted_at) throw new VerificationError("Venue not found.");
  if (member?.accepted_at) return { isClaim: false, vendorName: vendor.name };
  if (vendor.claim_status === "unclaimed" && vendor.status === "published") return { isClaim: true, vendorName: vendor.name };
  throw new VerificationError("You can't submit a request for this venue.");
}

/** Signed upload URL into the PRIVATE verification-docs bucket: {vendorId}/{userId}/{random}.{ext} */
export async function createVerificationDocUpload(
  session: SessionContext,
  vendorId: string,
  mime: string,
  size: number,
): Promise<{ path: string; token: string }> {
  await assertCanRequest(session, vendorId);
  const ext = DOC_TYPES[mime];
  if (!ext) throw new VerificationError("Upload a PDF, JPEG, PNG or WebP file.");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_DOC_BYTES) throw new VerificationError("Documents must be 10 MB or smaller.");
  const path = `${vendorId}/${session.user.id}/${nanoid(16)}.${ext}`;
  const { data, error } = await getAdminSupabase().storage.from(DOCS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new VerificationError("Couldn't start the upload.");
  return { path: data.path, token: data.token };
}

const requestSchema = z.object({
  vendorId: z.uuid(),
  businessDocPath: z.string().max(200).nullable(),
  idDocPath: z.string().max(200).nullable(),
  socialProofUrl: z.string().trim().max(500).nullable(),
  note: z.string().trim().max(2000).nullable(),
});

export async function submitVerificationRequest(
  session: SessionContext,
  raw: unknown,
  meta: { ip: string | null; userAgent: string | null },
): Promise<{ id: string; isClaim: boolean }> {
  const input = requestSchema.parse(raw);
  const { isClaim, vendorName } = await assertCanRequest(session, input.vendorId);
  const ownPrefix = `${input.vendorId}/${session.user.id}/`;
  for (const p of [input.businessDocPath, input.idDocPath]) {
    if (p && (!p.startsWith(ownPrefix) || p.includes(".."))) throw new VerificationError("Invalid document upload.");
  }
  if (!input.businessDocPath && !input.idDocPath && !input.socialProofUrl) {
    throw new VerificationError("Add at least one document or a link to your venue's official social account.");
  }
  if (isClaim && !input.idDocPath) throw new VerificationError("Claims need a photo ID so we can confirm you represent the venue.");
  const social = input.socialProofUrl ? safeExternalUrl(/^https?:\/\//.test(input.socialProofUrl) ? input.socialProofUrl : `https://${input.socialProofUrl}`) : null;

  const { data, error } = await getAdminSupabase().rpc("admin_create_verification_request", {
    p_vendor_id: input.vendorId,
    p_submitted_by: session.user.id,
    p_business_doc_path: input.businessDocPath ?? undefined,
    p_id_doc_path: input.idDocPath ?? undefined,
    p_social_proof_url: social ?? undefined,
    p_note: input.note ?? undefined,
  });
  if (error) {
    throw new VerificationError(error.message.includes("already pending") ? "You already have a request in review for this venue." : "We couldn't submit your request.");
  }
  await writeAudit({
    action: isClaim ? "vendor.claim_requested" : "vendor.verification_requested",
    entityType: "public.vendors",
    entityId: input.vendorId,
    after: { request_id: data, has_business_doc: Boolean(input.businessDocPath), has_id_doc: Boolean(input.idDocPath) },
    actorId: session.user.id,
    actorRole: session.profile.role,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  await sendEmail({
    to: adminRecipients(),
    subject: `${isClaim ? "Claim" : "Verification"} request: ${vendorName}`,
    react: AdminVendorSubmittedEmail({ vendorName: `${vendorName} (${isClaim ? "claim" : "verification"})`, city: null }),
  });
  return { id: data, isClaim };
}
