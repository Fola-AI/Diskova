import { ApiProblem, ok, publicRead } from "@/lib/api/v1";
import { getVendorBySlug, listRecentOfficialUpdates, listVendorPrices } from "@/lib/db/directory";
import { getVendorLive } from "@/lib/db/live";
import { slugParam } from "@/lib/validation/routes";

/** GET /api/v1/vendors/:slug — listing, prices, live crowd and recent official updates. */
export const GET = publicRead(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const vendor = await getVendorBySlug(slugParam.parse((await params).slug));
  if (!vendor) throw new ApiProblem(404, "not_found", "Unknown venue.");
  const [prices, live, official] = await Promise.all([listVendorPrices(vendor.id), getVendorLive(vendor.id), listRecentOfficialUpdates(vendor.id)]);
  return ok({ ...vendor, prices, live, official_updates: official }, { slug: vendor.slug });
});
