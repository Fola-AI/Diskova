import {
  listAreas,
  listCategories,
  listVendorsForCity,
  type AreaRow,
  type CategoryRow,
  type CityRow,
  type VendorCardRow,
} from "@/lib/db/directory";
import { openStatus, parseOpeningHours } from "@/lib/services/opening-hours";
import type { CityFilters } from "@/lib/validation/directory";

export interface CityDirectory {
  vendors: VendorCardRow[];
  total: number;
  categories: Array<CategoryRow & { count: number }>;
  areas: AreaRow[];
}

/**
 * City directory: one query for the city's published vendors, filters applied here so the chip
 * counts reflect the city as a whole. "Open now" uses each venue's hours in the city's time zone.
 */
export async function getCityDirectory(city: CityRow, filters: CityFilters, now = new Date()): Promise<CityDirectory> {
  const [all, categories, areas] = await Promise.all([
    listVendorsForCity(city.id, { limit: 500 }),
    listCategories(),
    listAreas(city.id),
  ]);

  const counts = new Map<string, number>();
  for (const v of all) if (v.category) counts.set(v.category.slug, (counts.get(v.category.slug) ?? 0) + 1);

  const vendors = all.filter((v) => {
    if (filters.category && v.category?.slug !== filters.category) return false;
    if (filters.area && v.area?.slug !== filters.area) return false;
    if (filters.price && v.price_band !== filters.price) return false;
    if (filters.feature && !v.features.includes(filters.feature)) return false;
    if (filters.open && !openStatus(parseOpeningHours(v.opening_hours), now, city.timezone).isOpen) return false;
    return true;
  });

  return {
    vendors,
    total: all.length,
    categories: categories.filter((c) => counts.has(c.slug)).map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 })),
    areas,
  };
}
