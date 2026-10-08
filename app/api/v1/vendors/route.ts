import { z } from "zod";

import { ApiProblem, clampLimit, ok, publicRead } from "@/lib/api/v1";
import { getCityBySlug, listAreas, listCategories, listVendorsForCity, searchDirectory } from "@/lib/db/directory";
import { slugParam } from "@/lib/validation/routes";

const query = z.object({
  city: slugParam.optional(),
  q: z.string().trim().min(2).max(80).optional(),
  category: slugParam.optional(),
  area: slugParam.optional(),
  price: z.enum(["free", "budget", "mid", "premium", "luxury"]).optional(),
  feature: z.string().regex(/^[a-z_]{2,40}$/).optional(),
});

/** GET /api/v1/vendors?city=lagos[&category&area&price&feature&limit] or ?q=search[&city] */
export const GET = publicRead(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const f = query.parse(Object.fromEntries([...sp].filter(([k]) => k !== "limit")));
  const limit = clampLimit(sp.get("limit"), 50, 120);
  const city = f.city ? await getCityBySlug(f.city) : null;
  if (f.city && !city) throw new ApiProblem(404, "not_found", "Unknown city.");
  if (f.q) {
    const hits = await searchDirectory(f.q, city?.id, Math.min(limit, 20));
    return ok(hits, { q: f.q, count: hits.length });
  }
  if (!city) throw new ApiProblem(400, "invalid_request", "Pass ?city=<slug> or ?q=<search>.");
  const [categories, areas] = await Promise.all([listCategories(), listAreas(city.id)]);
  const vendors = await listVendorsForCity(city.id, {
    categoryId: f.category ? categories.find((c) => c.slug === f.category)?.id ?? "00000000-0000-0000-0000-000000000000" : undefined,
    areaId: f.area ? areas.find((a) => a.slug === f.area)?.id ?? "00000000-0000-0000-0000-000000000000" : undefined,
    priceBand: f.price,
    feature: f.feature,
    limit,
  });
  return ok(vendors.map(({ opening_hours: _h, ...v }) => v), { city: city.slug, count: vendors.length, limit });
});
