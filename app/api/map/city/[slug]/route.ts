import { NextResponse } from "next/server";

import { MAPBOX_TOKEN } from "@/lib/config";
import { getCityBySlug, listCities } from "@/lib/db/directory";
import { renderCityMapPreview } from "@/lib/services/map-preview";
import { slugParam } from "@/lib/validation/routes";

// Prebuilt per city at build time and regenerated at most every 30 days (ISR): served straight from
// cache, so it's a fast, same-origin LCP image. One Mapbox call per city per month.
export const revalidate = 2_592_000;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  if (!MAPBOX_TOKEN) return [];
  return (await listCities()).filter((c) => c.lat !== null && c.lng !== null).map((c) => ({ slug: c.slug }));
}

/** GET /api/map/city/:slug — WebP map preview for a city. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = slugParam.safeParse((await params).slug);
  if (!slug.success) return new NextResponse("Not found", { status: 404 });
  const city = await getCityBySlug(slug.data);
  if (!city || city.lat === null || city.lng === null) return new NextResponse("Not found", { status: 404 });
  const img = await renderCityMapPreview({ lat: city.lat, lng: city.lng });
  // Throw rather than return an error body, so a transient Mapbox failure is never cached for 30 days.
  if (!img) throw new Error(`map preview unavailable for ${city.slug}`);
  return new NextResponse(new Uint8Array(img), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400" },
  });
}
