import { ApiProblem, ok, publicRead } from "@/lib/api/v1";
import { getCityBySlug } from "@/lib/db/directory";
import { getCityLive } from "@/lib/db/live";
import { slugParam } from "@/lib/validation/routes";

/** GET /api/v1/cities/:slug/live — venues with recent crowd signals (the Tonight view). */
export const GET = publicRead(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const city = await getCityBySlug(slugParam.parse((await params).slug));
  if (!city) throw new ApiProblem(404, "not_found", "Unknown city.");
  const live = await getCityLive(city.id);
  return ok(
    live.map(({ photo_placeholder: _p, ...v }) => v),
    { city: city.slug, count: live.length },
    30,
  );
});
