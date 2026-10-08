import { getPublicSupabase } from "@/lib/db/public";
import type { Database } from "@/lib/db/types";

export type SafetySection = Database["public"]["Enums"]["safety_section"];

export interface SafetyBlock {
  id: string;
  city_id: string | null;
  section: SafetySection;
  title: string;
  body_md: string;
  sort_order: number;
  last_verified_at: string | null;
}

/** National (city_id null) + city-specific safety information. */
export async function listSafetyInfo(cityId: string | null): Promise<SafetyBlock[]> {
  let q = getPublicSupabase().from("safety_info").select("id, city_id, section, title, body_md, sort_order, last_verified_at");
  q = cityId ? q.or(`city_id.is.null,city_id.eq.${cityId}`) : q.is("city_id", null);
  const { data, error } = await q.order("sort_order");
  if (error) throw error;
  return data ?? [];
}
