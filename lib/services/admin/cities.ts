import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { safeRevalidatePath } from "@/lib/http/revalidate";
import { assertServerOnly } from "@/lib/server-only";
import { AdminActionError, type StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/cities");

const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes.");
const point = { lat: z.coerce.number().min(4).max(14), lng: z.coerce.number().min(2.5).max(15) };

export const citySchema = z.object({
  id: z.uuid().optional(),
  slug,
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  timezone: z.string().trim().default("Africa/Lagos"),
  intro_md: z.string().trim().max(2000).optional().transform((v) => v || null),
  is_active: z.union([z.boolean(), z.literal("on"), z.literal("")]).optional().transform((v) => v === true || v === "on"),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  ...point,
});

export const areaSchema = z.object({
  id: z.uuid().optional(),
  city_id: z.uuid(),
  slug,
  name: z.string().trim().min(2).max(80),
  is_active: z.union([z.boolean(), z.literal("on"), z.literal("")]).optional().transform((v) => v === true || v === "on"),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  ...point,
});

const wkt = (lat: number, lng: number) => `SRID=4326;POINT(${lng} ${lat})`;

/** §11.10 — cities and areas are data, not code: add or edit without a deploy. */
export async function saveCity(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<string> {
  const { id, lat, lng, ...rest } = citySchema.parse(raw);
  const admin = getAdminSupabase();
  const row = { ...rest, centroid: wkt(lat, lng) };
  const { data, error } = id
    ? await admin.from("cities").update(row).eq("id", id).select("id").single()
    : await admin.from("cities").insert(row).select("id").single();
  if (error || !data) throw new AdminActionError(error?.code === "23505" ? "That slug is taken." : "Couldn't save the city.");
  await writeAudit({ action: id ? "city.updated" : "city.created", entityType: "public.cities", entityId: data.id, after: rest, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  safeRevalidatePath("/");
  return data.id;
}

export async function saveArea(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<string> {
  const { id, lat, lng, ...rest } = areaSchema.parse(raw);
  const admin = getAdminSupabase();
  const row = { ...rest, centroid: wkt(lat, lng) };
  const { data, error } = id
    ? await admin.from("areas").update(row).eq("id", id).select("id").single()
    : await admin.from("areas").insert(row).select("id").single();
  if (error || !data) throw new AdminActionError(error?.code === "23505" ? "That slug is taken in this city." : "Couldn't save the area.");
  await writeAudit({ action: id ? "area.updated" : "area.created", entityType: "public.areas", entityId: data.id, after: rest, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  return data.id;
}

export async function listCitiesAdmin() {
  const admin = getAdminSupabase();
  const [{ data: cities }, { data: areas }] = await Promise.all([
    admin.from("cities").select("id, slug, name, state, timezone, intro_md, is_active, sort_order, lat, lng").order("sort_order"),
    admin.from("areas").select("id, city_id, slug, name, is_active, sort_order, lat, lng").order("sort_order"),
  ]);
  return { cities: (cities ?? []) as unknown as Array<{ id: string; slug: string; name: string; state: string; timezone: string; intro_md: string | null; is_active: boolean; sort_order: number; lat: number; lng: number }>, areas: (areas ?? []) as unknown as Array<{ id: string; city_id: string; slug: string; name: string; is_active: boolean; sort_order: number; lat: number | null; lng: number | null }> };
}
