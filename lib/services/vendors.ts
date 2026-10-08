import { nanoid } from "nanoid";
import slugify from "slugify";
import { cookies } from "next/headers";

import type { SessionContext } from "@/lib/auth/guards";
import type { VendorMemberRole } from "@/lib/auth/roles";
import { getAdminSupabase } from "@/lib/admin-db/client";
import type { Database } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";
import {
  vendorBasicsSchema,
  vendorContactSchema,
  vendorDetailsSchema,
  vendorPricesSchema,
  type VendorStep,
} from "@/lib/validation/vendor";

assertServerOnly("lib/services/vendors");

export type VendorRow = Database["public"]["Tables"]["vendors"]["Row"];
export class VendorError extends Error {}

const CTX_COOKIE = "vendor_ctx";

export interface MyVendor {
  id: string;
  slug: string;
  name: string;
  status: Database["public"]["Enums"]["vendor_status"];
  verified: boolean;
  role: VendorMemberRole;
}

/** Vendors the signed-in user is an accepted member of. */
export async function listMyVendors(session: SessionContext): Promise<MyVendor[]> {
  const { data, error } = await session.supabase
    .from("vendor_members")
    .select("role, accepted_at, vendor:vendors(id, slug, name, status, verified, deleted_at)")
    .eq("profile_id", session.user.id)
    .not("accepted_at", "is", null);
  if (error) throw error;
  return (data ?? [])
    .map((m) => ({ role: m.role, vendor: m.vendor as unknown as (Omit<MyVendor, "role"> & { deleted_at: string | null }) | null }))
    .filter((m) => m.vendor && !m.vendor.deleted_at)
    .map((m) => ({ ...m.vendor!, role: m.role }));
}

/** The vendor the dashboard is working on: cookie choice if still a member, else the first. */
export async function getCurrentVendor(session: SessionContext): Promise<MyVendor | null> {
  const mine = await listMyVendors(session);
  if (!mine.length) return null;
  const chosen = (await cookies()).get(CTX_COOKIE)?.value;
  return mine.find((v) => v.id === chosen) ?? mine[0];
}

export async function setCurrentVendorCookie(vendorId: string): Promise<void> {
  (await cookies()).set(CTX_COOKIE, vendorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

/** Full row for a vendor the caller can see (members see drafts). */
export async function getVendorForEditing(session: SessionContext, vendorId: string) {
  const { data, error } = await session.supabase
    .from("vendors")
    .select("*, lat, lng, vendor_completeness, city:cities(slug, name), area:areas(slug, name), category:categories(slug, name)")
    .eq("id", vendorId)
    .is("deleted_at", null)
    .single();
  if (error) throw new VendorError("Venue not found.");
  return data;
}

function pointWkt(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/** URL-safe unique slug: "<name>-<city>", with a short suffix if taken. */
export async function generateVendorSlug(name: string, citySlug: string): Promise<string> {
  const base = slugify(`${name} ${citySlug}`, { lower: true, strict: true, trim: true }).slice(0, 70).replace(/-+$/, "") || "venue";
  const admin = getAdminSupabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${nanoid(4).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
    const { count } = await admin.from("vendors").select("id", { count: "exact", head: true }).eq("slug", candidate);
    if (!count) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Step 1 of onboarding: create the draft vendor (caller becomes owner via trigger). */
export async function createVendorDraft(session: SessionContext, raw: unknown): Promise<{ id: string; slug: string }> {
  const input = vendorBasicsSchema.parse(raw);
  const { data: city } = await session.supabase.from("cities").select("slug").eq("id", input.city_id).single();
  if (!city) throw new VendorError("Choose a city.");
  const { data: area } = await session.supabase.from("areas").select("id").eq("id", input.area_id).eq("city_id", input.city_id).maybeSingle();
  if (!area) throw new VendorError("That area isn't in the selected city.");

  const slug = await generateVendorSlug(input.name, city.slug);
  const { lat, lng, ...rest } = input;
  const { data, error } = await session.supabase
    .from("vendors")
    .insert({ ...rest, slug, location: pointWkt(lat, lng), owner_profile_id: session.user.id })
    .select("id, slug")
    .single();
  if (error) throw new VendorError("We couldn't create your listing. Please try again.");
  await setCurrentVendorCookie(data.id);
  return data;
}

/** Autosave for a wizard step (members with manager+ role; RLS + column grants enforce it again). */
export async function saveVendorStep(session: SessionContext, vendorId: string, step: VendorStep, raw: unknown): Promise<void> {
  let patch: Database["public"]["Tables"]["vendors"]["Update"];
  switch (step) {
    case "basics": {
      const { lat, lng, city_id: _city, ...rest } = vendorBasicsSchema.parse(raw);
      patch = { ...rest, location: pointWkt(lat, lng) };
      break;
    }
    case "contact":
      patch = vendorContactSchema.parse(raw);
      break;
    case "details":
      patch = vendorDetailsSchema.parse(raw);
      break;
    default:
      throw new VendorError("Nothing to save on this step.");
  }
  const { data, error } = await session.supabase.from("vendors").update(patch).eq("id", vendorId).select("id");
  if (error) throw new VendorError("We couldn't save your changes. Please try again.");
  if (!data?.length) throw new VendorError("You don't have permission to edit this venue.");
}

/** Replace the vendor's price list (managers). */
export async function savePrices(session: SessionContext, vendorId: string, raw: unknown): Promise<void> {
  const prices = vendorPricesSchema.parse(raw);
  const { data: existing, error: readError } = await session.supabase.from("vendor_prices").select("id").eq("vendor_id", vendorId);
  if (readError) throw new VendorError("Couldn't load your prices.");
  const keep = new Set(prices.filter((p) => p.id).map((p) => p.id));
  const remove = (existing ?? []).map((p) => p.id).filter((id) => !keep.has(id));
  if (remove.length) {
    const { error } = await session.supabase.from("vendor_prices").delete().in("id", remove);
    if (error) throw new VendorError("Couldn't update your prices.");
  }
  for (const p of prices) {
    const row = { label: p.label, amount_ngn: p.amount_ngn, note: p.note };
    const { error } = p.id
      ? await session.supabase.from("vendor_prices").update(row).eq("id", p.id).eq("vendor_id", vendorId)
      : await session.supabase.from("vendor_prices").insert({ ...row, vendor_id: vendorId });
    if (error) throw new VendorError("Couldn't save a price. Please check the amounts.");
  }
}

export interface SubmissionCheck {
  ready: boolean;
  missing: string[];
}

/** Minimum for review: area, location and at least one way to contact the venue. */
export function checkSubmission(v: Pick<VendorRow, "name" | "area_id" | "phone" | "whatsapp" | "website_url" | "email">): SubmissionCheck {
  const missing: string[] = [];
  if (!v.name) missing.push("Venue name");
  if (!v.area_id) missing.push("Area");
  if (!v.phone && !v.whatsapp && !v.website_url && !v.email) missing.push("At least one contact method");
  return { ready: missing.length === 0, missing };
}
