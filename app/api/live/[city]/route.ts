import { NextResponse, type NextRequest } from "next/server";

import { getCityBySlug } from "@/lib/db/directory";
import { getCityLive } from "@/lib/db/live";
import { clientIpFrom } from "@/lib/http/request-meta";
import { rateLimit } from "@/lib/ratelimit";

/**
 * Tonight view data for anonymous polling (§8.1): CDN-cached 30 s, 120 requests/IP/min (generous for
 * carrier-grade NAT). Signed-in visitors refetch with a cache-busting query on Realtime events.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ city: string }> }): Promise<NextResponse> {
  const rl = await rateLimit("liveIp", clientIpFrom(request.headers));
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const city = await getCityBySlug((await params).city);
  if (!city) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const live = await getCityLive(city.id);
  return NextResponse.json(
    { city: city.slug, live, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" } },
  );
}
