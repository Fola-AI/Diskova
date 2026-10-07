import { z } from "zod";

import { FEATURE_KEYS } from "@/lib/directory/constants";

const slug = z.string().regex(/^[a-z0-9_-]{1,60}$/);

/** City directory filters from the query string. Invalid values are dropped, never errors. */
export const cityFiltersSchema = z.object({
  category: slug.optional().catch(undefined),
  area: slug.optional().catch(undefined),
  price: z.enum(["free", "budget", "mid", "premium", "luxury"]).optional().catch(undefined),
  feature: z.enum(FEATURE_KEYS as [string, ...string[]]).optional().catch(undefined),
  open: z.literal("1").optional().catch(undefined),
});

export type CityFilters = z.infer<typeof cityFiltersSchema>;

export function parseCityFilters(params: Record<string, string | string[] | undefined>): CityFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) flat[k] = Array.isArray(v) ? v[0] : v;
  return cityFiltersSchema.parse(flat);
}

export function filtersToQuery(filters: CityFilters, override: Partial<CityFilters> = {}): string {
  const merged = { ...filters, ...override };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
