import { NextResponse } from "next/server";

import { getVendorBySlug } from "@/lib/db/directory";
import { renderVendorMapPreview } from "@/lib/services/map-preview";
import { slugParam } from "@/lib/validation/routes";

// Generated on first request per venue, then served from cache for up to 30 days (ISR).
export const revalidate = 2_592_000;
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return [];
}

/** GET /api/map/vendor/:slug — WebP map preview with the venue pinned. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = slugParam.safeParse((await params).slug);
  if (!slug.success) return new NextResponse("Not found", { status: 404 });
  const vendor = await getVendorBySlug(slug.data);
  if (!vendor || vendor.lat === null || vendor.lng === null) return new NextResponse("Not found", { status: 404 });
  const img = await renderVendorMapPreview({ lat: vendor.lat, lng: vendor.lng });
  if (!img) throw new Error(`map preview unavailable for ${vendor.slug}`);
  return new NextResponse(new Uint8Array(img), {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400" },
  });
}
