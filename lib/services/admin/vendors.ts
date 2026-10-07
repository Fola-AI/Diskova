import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { sendEmail } from "@/lib/email/send";
import { VendorDecisionEmail, VerificationDecisionEmail } from "@/lib/email/templates/vendor";
import { assertServerOnly } from "@/lib/server-only";
import { DOCS_BUCKET } from "@/lib/services/verification";

assertServerOnly("lib/services/admin/vendors");

/**
 * Staff vendor actions (§11.2 minimal set for L5, extended in L12). Callers have already passed
 * requireRole('admin') (aal2). Every action is audited; destructive ones require a reason.
 */
export class AdminActionError extends Error {}

export interface StaffMeta {
  ip: string | null;
  userAgent: string | null;
}

const reasonSchema = z.string().trim().min(5, "Give a reason (at least 5 characters).").max(1000);

async function ownerEmail(profileId: string | null): Promise<string | null> {
  if (!profileId) return null;
  const { data } = await getAdminSupabase().auth.admin.getUserById(profileId);
  return data.user?.email ?? null;
}

export async function listVendorsForReview() {
  const { data, error } = await getAdminSupabase()
    .from("vendors")
    .select("id, slug, name, status, verified, claim_status, created_at, updated_at, owner_profile_id, vendor_completeness, city:cities(name), category:categories(name), owner:profiles!vendors_owner_profile_id_fkey(username)")
    .eq("status", "pending_review")
    .is("deleted_at", null)
    .order("updated_at");
  if (error) throw error;
  return data ?? [];
}

export async function decideVendor(
  session: SessionContext,
  vendorId: string,
  decision: "approve" | "reject",
  reasonRaw: string | null,
  meta: StaffMeta,
): Promise<void> {
  const admin = getAdminSupabase();
  const { data: before } = await admin.from("vendors").select("id, slug, name, status, owner_profile_id").eq("id", vendorId).single();
  if (!before) throw new AdminActionError("Vendor not found.");
  if (before.status !== "pending_review") throw new AdminActionError(`This vendor is ${before.status.replace("_", " ")}, not pending review.`);
  const reason = decision === "reject" ? reasonSchema.parse(reasonRaw ?? "") : reasonRaw?.trim() || null;
  const status = decision === "approve" ? "published" : "rejected";

  const { error } = await admin.from("vendors").update({ status }).eq("id", vendorId);
  if (error) throw new AdminActionError("Couldn't update the vendor.");
  await writeAudit({
    action: decision === "approve" ? "vendor.approved" : "vendor.rejected",
    entityType: "public.vendors",
    entityId: vendorId,
    before: { status: before.status },
    after: { status },
    reason,
    actorId: session.user.id,
    actorRole: session.profile.role,
    ...meta,
  });
  await sendEmail({
    to: await ownerEmail(before.owner_profile_id),
    subject: decision === "approve" ? `${before.name} is live` : `About your listing: ${before.name}`,
    react: VendorDecisionEmail({ vendorName: before.name, slug: before.slug, approved: decision === "approve", reason }),
  });
  revalidatePath(`/v/${before.slug}`);
}

export async function listVerificationRequests() {
  const admin = getAdminSupabase();
  const { data, error } = await admin.rpc("admin_list_verification_requests", { p_status: "pending" });
  if (error) throw error;
  // 10-minute signed read URLs for documents (§7.6), minted only for the admin viewing the queue.
  return Promise.all(
    (data ?? []).map(async (r) => {
      const sign = async (path: string | null) =>
        path ? (await admin.storage.from(DOCS_BUCKET).createSignedUrl(path, 600)).data?.signedUrl ?? null : null;
      return { ...r, business_doc_url: await sign(r.business_doc_path), id_doc_url: await sign(r.id_doc_path) };
    }),
  );
}

export async function decideVerification(
  session: SessionContext,
  requestId: string,
  decision: "approve" | "reject",
  reasonRaw: string | null,
  meta: StaffMeta,
): Promise<void> {
  const admin = getAdminSupabase();
  const reason = decision === "reject" ? reasonSchema.parse(reasonRaw ?? "") : null;
  const { data: pending } = await admin.rpc("admin_list_verification_requests", { p_status: "pending" });
  const request = (pending ?? []).find((r) => r.id === requestId);
  if (!request) throw new AdminActionError("Request not found or already decided.");

  const { data: decided, error } = await admin.rpc("admin_decide_verification_request", {
    p_id: requestId,
    p_status: decision === "approve" ? "approved" : "rejected",
    p_reviewer: session.user.id,
    p_reason: reason ?? undefined,
  });
  if (error || !decided?.length) throw new AdminActionError("Couldn't record the decision.");

  const vendorId = request.vendor_id;
  if (decision === "approve") {
    const now = new Date().toISOString();
    if (request.is_claim && request.submitted_by) {
      // Claim approved: the claimant becomes the owner. Documents reviewed → also verified.
      await admin
        .from("vendor_members")
        .upsert({ vendor_id: vendorId, profile_id: request.submitted_by, role: "owner", accepted_at: now, invited_by: session.user.id });
      await admin
        .from("vendors")
        .update({ owner_profile_id: request.submitted_by, claim_status: "claimed", verified: true, verified_at: now, verified_by: session.user.id })
        .eq("id", vendorId);
    } else {
      await admin.from("vendors").update({ verified: true, verified_at: now, verified_by: session.user.id }).eq("id", vendorId);
    }
  }

  await writeAudit({
    action: `vendor.${request.is_claim ? "claim" : "verification"}_${decision === "approve" ? "approved" : "rejected"}`,
    entityType: "public.vendors",
    entityId: vendorId,
    after: { request_id: requestId, claimant: request.is_claim ? request.submitted_by : undefined },
    reason,
    actorId: session.user.id,
    actorRole: session.profile.role,
    ...meta,
  });
  await sendEmail({
    to: await ownerEmail(request.submitted_by),
    subject: `Your ${request.is_claim ? "claim" : "verification request"} for ${request.vendor_name}`,
    react: VerificationDecisionEmail({ vendorName: request.vendor_name, approved: decision === "approve", isClaim: request.is_claim, reason }),
  });
  revalidatePath(`/v/${request.vendor_slug}`);
}
