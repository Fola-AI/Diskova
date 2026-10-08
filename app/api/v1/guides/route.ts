import { z } from "zod";

import { ApiProblem, clampLimit, ok, publicRead } from "@/lib/api/v1";
import { getCityBySlug } from "@/lib/db/directory";
import { guideHref, listPublishedGuides, type GuideType } from "@/lib/db/guides";
import { SITE_URL } from "@/lib/config";
import { slugParam } from "@/lib/validation/routes";

const TYPES = ["city_guide", "area_guide", "daytime", "toolkit", "blog", "safety_page"] as const;
const query = z.object({ type: z.enum(TYPES).optional(), city: slugParam.optional(), tag: z.string().regex(/^[a-z0-9-]{1,40}$/).optional() });

/** GET /api/v1/guides[?type&city&tag&limit] — published guides, toolkit and blog (summaries; read the full text on the site). */
export const GET = publicRead(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const q = query.parse(Object.fromEntries([...sp].filter(([k]) => k !== "limit")));
  const city = q.city ? await getCityBySlug(q.city) : null;
  if (q.city && !city) throw new ApiProblem(404, "not_found", "Unknown city.");
  const guides = await listPublishedGuides({ types: q.type ? [q.type as GuideType] : [...TYPES] as GuideType[], cityId: city?.id, tag: q.tag, limit: clampLimit(sp.get("limit"), 20, 100) });
  return ok(
    guides.map((g) => ({ id: g.id, type: g.type, slug: g.slug, title: g.title, excerpt: g.excerpt, cover_image_url: g.cover_image_url, tags: g.tags, city: g.city, published_at: g.published_at, updated_at: g.updated_at, url: `${SITE_URL}${guideHref(g)}` })),
    { count: guides.length },
    300,
  );
});
