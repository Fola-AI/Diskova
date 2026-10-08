import { ApiProblem, clampLimit, ok, publicRead } from "@/lib/api/v1";
import { getVendorBySlug } from "@/lib/db/directory";
import { listVendorFeed } from "@/lib/db/feed";
import { slugParam } from "@/lib/validation/routes";

/** GET /api/v1/vendors/:slug/posts — recent public community posts (unverified unless `verified`). */
export const GET = publicRead(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const vendor = await getVendorBySlug(slugParam.parse((await params).slug));
  if (!vendor) throw new ApiProblem(404, "not_found", "Unknown venue.");
  const posts = await listVendorFeed(vendor.id, clampLimit(new URL(req.url).searchParams.get("limit"), 30, 50));
  return ok(
    posts.map((p) => ({ ...p, media: p.media.map(({ placeholder: _p, ...m }) => m) })),
    { vendor: vendor.slug, count: posts.length, label: "Unverified — posted by a community member unless verified=true" },
    15,
  );
});
