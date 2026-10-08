import { NextResponse, type NextRequest } from "next/server";

import { getVendorBySlug, listRecentOfficialUpdates } from "@/lib/db/directory";
import { listVendorFeed } from "@/lib/db/feed";
import { clientIpFrom } from "@/lib/http/request-meta";
import { rateLimit } from "@/lib/ratelimit";
import { slugParam } from "@/lib/validation/routes";

/**
 * Venue live feed JSON. Anonymous visitors poll it (CDN-cached ~10 s); signed-in visitors re-fetch it
 * with a cache-busting query when Realtime tells them something changed.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const rl = await rateLimit("liveIp", clientIpFrom(request.headers));
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const slug = slugParam.safeParse((await params).slug);
  if (!slug.success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const vendor = await getVendorBySlug(slug.data);
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [feed, official] = await Promise.all([listVendorFeed(vendor.id), listRecentOfficialUpdates(vendor.id)]);
  return NextResponse.json(
    { feed, official, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" } },
  );
}
