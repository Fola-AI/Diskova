import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { sendEmail } from "@/lib/email/send";
import { VendorDecisionEmail, VerificationDecisionEmail } from "@/lib/email/templates/vendor";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { DOCS_BUCKET } from "@/lib/services/verification";
import { reasonSchema } from "@/lib/services/admin/common";

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
  safeRevalidatePath(`/v/${before.slug}`);
  safeRevalidatePath("/sitemap.xml");
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
  safeRevalidatePath(`/v/${request.vendor_slug}`);
}

// ---------------------------------------------------------------------------------------------
// §11.2 full vendor table + actions (extends the L5 review queue)

export interface VendorTableFilters {
  q?: string;
  status?: "draft" | "pending_review" | "published" | "suspended" | "rejected";
  cityId?: string;
  areaId?: string;
  categoryId?: string;
  verified?: boolean;
  claim?: "unclaimed" | "claimed";
  noPrices?: boolean;
  noPhotos?: boolean;
  neverPosted?: boolean;
  sort?: string;
  desc?: boolean;
  limit?: number;
  offset?: number;
}

export async function listVendorsTable(f: VendorTableFilters) {
  const { data, error } = await getAdminSupabase().rpc("admin_list_vendors", {
    p_q: f.q || undefined,
    p_status: f.status,
    p_city_id: f.cityId,
    p_area_id: f.areaId,
    p_category_id: f.categoryId,
    p_verified: f.verified,
    p_claim: f.claim,
    p_no_prices: f.noPrices ?? false,
    p_no_photos: f.noPhotos ?? false,
    p_never_posted: f.neverPosted ?? false,
    p_sort: f.sort ?? "created_at",
    p_desc: f.desc ?? true,
    p_limit: f.limit ?? 50,
    p_offset: f.offset ?? 0,
  });
  if (error) throw error;
  return { rows: data ?? [], total: Number(data?.[0]?.total ?? 0) };
}

export type VendorAdminAction = "verify" | "unverify" | "suspend" | "unsuspend" | "approve" | "reject";

/** Verify / suspend / reinstate (reason required for anything destructive) — audited. */
export async function vendorAdminAction(session: SessionContext, vendorId: string, action: VendorAdminAction, reasonRaw: string | null, meta: StaffMeta): Promise<void> {
  if (action === "approve" || action === "reject") return decideVendor(session, vendorId, action, reasonRaw, meta);
  const admin = getAdminSupabase();
  const { data: v } = await admin.from("vendors").select("id, slug, status, verified").eq("id", vendorId).single();
  if (!v) throw new AdminActionError("Vendor not found.");
  const reason = action === "suspend" || action === "unverify" ? reasonSchema.parse(reasonRaw ?? "") : reasonRaw?.trim() || null;
  const now = new Date().toISOString();
  const patch =
    action === "verify" ? { verified: true, verified_at: now, verified_by: session.user.id }
    : action === "unverify" ? { verified: false, verified_at: null, verified_by: null }
    : action === "suspend" ? { status: "suspended" as const }
    : { status: "published" as const };
  if (action === "unsuspend" && v.status !== "suspended") throw new AdminActionError("This vendor isn't suspended.");
  const { error } = await admin.from("vendors").update(patch).eq("id", vendorId);
  if (error) throw new AdminActionError("Couldn't update the vendor.");
  await writeAudit({ action: `vendor.${action}`, entityType: "public.vendors", entityId: vendorId, before: { status: v.status, verified: v.verified }, after: patch as never, reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath(`/v/${v.slug}`);
}

export async function bulkVendorAction(session: SessionContext, ids: string[], action: "approve" | "suspend", reason: string | null, meta: StaffMeta): Promise<{ done: number; failed: number }> {
  let done = 0;
  let failed = 0;
  for (const id of ids.slice(0, 200)) {
    try {
      await vendorAdminAction(session, id, action, reason, meta);
      done++;
    } catch {
      failed++;
    }
  }
  return { done, failed };
}

/** §11.2 vendor detail tabs. */
export async function getVendorAdminDetail(id: string) {
  const admin = getAdminSupabase();
  const { data: vendor } = await admin
    .from("vendors")
    .select("*, city:cities(name), area:areas(name), category:categories!vendors_category_id_fkey(name), owner:profiles!vendors_owner_profile_id_fkey(id, username)")
    .eq("id", id)
    .maybeSingle();
  if (!vendor) return null;
  const [members, prices, posts, events, verification, reports, audit, notes] = await Promise.all([
    admin.from("vendor_members").select("role, accepted_at, created_at, profile:profiles!vendor_members_profile_id_fkey(id, username)").eq("vendor_id", id),
    admin.from("vendor_prices").select("id, label, amount_ngn, note, is_active, valid_from, valid_to").eq("vendor_id", id).order("created_at", { ascending: false }),
    admin.from("posts").select("id, kind, status, body, crowd_level, report_count, created_at, author:profiles!posts_author_id_fkey(username)").eq("vendor_id", id).order("created_at", { ascending: false }).limit(50),
    admin.from("events").select("id, slug, title, status, starts_at").eq("vendor_id", id).order("starts_at", { ascending: false }).limit(50),
    listVerificationRequests().then((r) => r.filter((x) => x.vendor_id === id)),
    admin.from("reports").select("id, reason, status, details, created_at").eq("entity_type", "vendor").eq("entity_id", id).order("created_at", { ascending: false }),
    admin.rpc("admin_list_audit", { p_entity_id: id, p_limit: 100 }),
    admin.rpc("admin_list_audit", { p_entity_id: id, p_action_prefix: "note.", p_limit: 100 }),
  ]);
  return {
    vendor,
    members: members.data ?? [],
    prices: prices.data ?? [],
    posts: posts.data ?? [],
    events: events.data ?? [],
    verification,
    reports: reports.data ?? [],
    audit: (audit.data ?? []).filter((a) => !a.action.startsWith("note.")),
    notes: notes.data ?? [],
  };
}

const vendorEditSchema = z.object({
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(140).transform((v) => v || null),
  description_md: z.string().trim().max(5000).transform((v) => v || null),
  phone: z.string().trim().max(30).transform((v) => v || null),
  whatsapp: z.string().trim().max(30).transform((v) => v || null),
  instagram_handle: z.string().trim().max(60).transform((v) => v.replace(/^@/, "") || null),
  website_url: z.union([z.url().max(300), z.literal("")]).transform((v) => v || null),
  reason: reasonSchema,
});

/** Staff edit of a listing's core text fields (§11.2 "edit"). Audited before/after. */
export async function adminEditVendor(session: SessionContext, vendorId: string, raw: unknown, meta: StaffMeta): Promise<void> {
  const { reason, ...patch } = vendorEditSchema.parse(raw);
  const admin = getAdminSupabase();
  const { data: before } = await admin.from("vendors").select("slug, name, tagline, description_md, phone, whatsapp, instagram_handle, website_url").eq("id", vendorId).single();
  if (!before) throw new AdminActionError("Vendor not found.");
  const { error } = await admin.from("vendors").update(patch).eq("id", vendorId);
  if (error) throw new AdminActionError("Couldn't save the vendor.");
  await writeAudit({ action: "vendor.edited_by_staff", entityType: "public.vendors", entityId: vendorId, before, after: patch, reason, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath(`/v/${before.slug}`);
}
