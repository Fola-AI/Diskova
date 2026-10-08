import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { getPublicSupabase } from "@/lib/db/public";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/itineraries");

/** Itineraries (PRD P4): curated multi-day plans with per-person costs. Staff write; public read. */
export interface ItineraryItem {
  id: string; day: number; sort_order: number; time_label: string | null; title: string; description_md: string | null;
  cost_ngn: number | null; cost_note: string | null;
  vendor: { id: string; slug: string; name: string; lat: number | null; lng: number | null } | null;
  event: { id: string; slug: string; title: string; starts_at: string } | null;
}
export interface Itinerary {
  id: string; slug: string; title: string; days: number; excerpt: string | null; intro_md: string; cover_image_url: string | null;
  status: string; seo_title: string | null; seo_description: string | null; published_at: string | null; updated_at: string;
  city: { id: string; slug: string; name: string } | null; items: ItineraryItem[];
}

const SELECT =
  "id, slug, title, days, excerpt, intro_md, cover_image_url, status, seo_title, seo_description, published_at, updated_at, city:cities(id, slug, name), items:itinerary_items(id, day, sort_order, time_label, title, description_md, cost_ngn, cost_note, vendor:vendors(id, slug, name, lat, lng), event:events(id, slug, title, starts_at))";

function sortItems(i: Itinerary): Itinerary {
  return { ...i, items: [...i.items].sort((a, b) => a.day - b.day || a.sort_order - b.sort_order) };
}

export async function getPublishedItinerary(slug: string): Promise<Itinerary | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  const { data } = await getPublicSupabase().from("itineraries").select(SELECT).eq("slug", slug).maybeSingle();
  return data ? sortItems(data as unknown as Itinerary) : null;
}

export async function listPublishedItineraries(cityId?: string) {
  let q = getPublicSupabase().from("itineraries").select("id, slug, title, days, excerpt, cover_image_url, published_at, city:cities(slug, name)");
  if (cityId) q = q.eq("city_id", cityId);
  const { data } = await q.order("published_at", { ascending: false }).limit(100);
  return (data ?? []) as unknown as Array<{ id: string; slug: string; title: string; days: number; excerpt: string | null; cover_image_url: string | null; published_at: string | null; city: { slug: string; name: string } | null }>;
}

// ------------------------------------------------------------------------------------------- admin

export async function listItinerariesAdmin() {
  const { data } = await getAdminSupabase().from("itineraries").select("id, slug, title, days, status, updated_at, city:cities(name)").is("deleted_at", null).order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getItineraryAdmin(id: string): Promise<Itinerary | null> {
  const { data } = await getAdminSupabase().from("itineraries").select(SELECT).eq("id", z.uuid().parse(id)).maybeSingle();
  return data ? sortItems(data as unknown as Itinerary) : null;
}

const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const itinerarySchema = z.object({
  id: z.uuid().optional(),
  slug: z.string().trim().regex(slugRe, "Slug: lowercase letters, numbers and dashes.").max(90),
  title: z.string().trim().min(3).max(160),
  cityId: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
  days: z.coerce.number().int().min(1).max(14),
  excerpt: z.string().trim().max(300).optional().transform((v) => v || null),
  intro_md: z.string().max(20000).default(""),
  seo_title: z.string().trim().max(70).optional().transform((v) => v || null),
  seo_description: z.string().trim().max(170).optional().transform((v) => v || null),
  items: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1).max(14),
        time_label: z.string().trim().max(40).optional().transform((v) => v || null),
        title: z.string().trim().min(2, "Every stop needs a title.").max(140),
        vendor_slug: z.string().trim().max(120).optional().transform((v) => v || null),
        description_md: z.string().trim().max(4000).optional().transform((v) => v || null),
        cost_ngn: z.union([z.literal(""), z.null(), z.coerce.number().int().min(0).max(100_000_000)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
        cost_note: z.string().trim().max(140).optional().transform((v) => v || null),
      }),
    )
    .max(120),
}).superRefine((v, ctx) => {
  v.items.forEach((it, i) => {
    if (it.day > v.days) ctx.addIssue({ code: "custom", path: ["items", i, "day"], message: `Stop ${i + 1} is on day ${it.day}, but the itinerary has ${v.days} day(s).` });
  });
});

/** Create or update an itinerary and replace its stops (one transaction-like sequence, audited). */
export async function saveItinerary(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<string> {
  const input = itinerarySchema.parse(raw);
  const admin = getAdminSupabase();
  const slugs = [...new Set(input.items.map((i) => i.vendor_slug).filter((s): s is string => Boolean(s)))];
  const { data: vendors } = slugs.length ? await admin.from("vendors").select("id, slug").in("slug", slugs).is("deleted_at", null) : { data: [] };
  const vendorId = new Map((vendors ?? []).map((v) => [v.slug, v.id]));
  const missing = slugs.filter((s) => !vendorId.has(s));
  if (missing.length) throw new AdminActionError(`Unknown venue slug(s): ${missing.join(", ")}`);

  const row = { slug: input.slug, title: input.title, city_id: input.cityId, days: input.days, excerpt: input.excerpt, intro_md: input.intro_md, seo_title: input.seo_title, seo_description: input.seo_description, updated_by: session.user.id };
  const { data: saved, error } = input.id
    ? await admin.from("itineraries").update(row).eq("id", input.id).select("id, slug, status").single()
    : await admin.from("itineraries").insert({ ...row, created_by: session.user.id }).select("id, slug, status").single();
  if (error || !saved) throw new AdminActionError(error?.code === "23505" ? "That slug is already used." : "Couldn't save the itinerary.");

  await admin.from("itinerary_items").delete().eq("itinerary_id", saved.id);
  if (input.items.length) {
    const perDay = new Map<number, number>();
    const { error: itemsError } = await admin.from("itinerary_items").insert(
      input.items.map((it) => {
        const n = perDay.get(it.day) ?? 0;
        perDay.set(it.day, n + 1);
        return { itinerary_id: saved.id, day: it.day, sort_order: n * 10, time_label: it.time_label, title: it.title, vendor_id: it.vendor_slug ? vendorId.get(it.vendor_slug)! : null, description_md: it.description_md, cost_ngn: it.cost_ngn, cost_note: it.cost_note };
      }),
    );
    if (itemsError) throw new AdminActionError("Couldn't save the stops.");
  }
  await writeAudit({ action: input.id ? "itinerary.updated" : "itinerary.created", entityType: "public.itineraries", entityId: saved.id, after: { title: input.title, days: input.days, stops: input.items.length }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  if (saved.status === "published") safeRevalidatePath(`/itineraries/${saved.slug}`);
  safeRevalidatePath("/itineraries");
  return saved.id;
}

export async function setItineraryStatus(session: SessionContext, id: string, status: "draft" | "published" | "archived", meta: StaffMeta): Promise<void> {
  const admin = getAdminSupabase();
  const { data: cur } = await admin.from("itineraries").select("slug, published_at, items:itinerary_items(id)").eq("id", z.uuid().parse(id)).single();
  if (!cur) throw new AdminActionError("Not found.");
  if (status === "published" && !(cur.items as unknown[]).length) throw new AdminActionError("Add at least one stop before publishing.");
  const { error } = await admin.from("itineraries").update({ status, ...(status === "published" && !cur.published_at ? { published_at: new Date().toISOString() } : {}), updated_by: session.user.id }).eq("id", id);
  if (error) throw new AdminActionError("Couldn't change the status.");
  await writeAudit({ action: `itinerary.${status}`, entityType: "public.itineraries", entityId: id, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath(`/itineraries/${cur.slug}`);
  safeRevalidatePath("/itineraries");
  safeRevalidatePath("/sitemap.xml");
}
