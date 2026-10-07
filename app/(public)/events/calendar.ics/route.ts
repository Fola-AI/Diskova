import { NextResponse, type NextRequest } from "next/server";

import { BRAND_NAME, SEASON_NAME, SITE_URL } from "@/lib/config";
import { getCityBySlug } from "@/lib/db/directory";
import { listEvents } from "@/lib/db/events";
import { buildCalendar } from "@/lib/events/ical";
import { calendarQuery } from "@/lib/validation/routes";

/** Subscribable iCal feed: /events/calendar.ics?city=lagos&season=december (§8.6). */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = calendarQuery.parse(Object.fromEntries(request.nextUrl.searchParams));
  const citySlug = q.city;
  const season = q.season === "december";
  const city = citySlug ? await getCityBySlug(citySlug) : null;
  const events = await listEvents({ from: new Date(Date.now() - 86_400_000), cityId: city?.id, seasonOnly: season, limit: 500 });
  const host = new URL(SITE_URL).host;
  const name = [season ? SEASON_NAME : `${BRAND_NAME} events`, city?.name].filter(Boolean).join(" · ");
  const ics = buildCalendar({
    name,
    prodId: `-//${BRAND_NAME}//Events//EN`,
    events: events.map((e) => ({
      uid: `${e.id}@${host}`,
      title: e.title,
      location: [e.venue?.name ?? e.venue_name_freeform, e.city?.name].filter(Boolean).join(", "),
      url: `${SITE_URL}/events/${e.slug}`,
      start: new Date(e.starts_at),
      end: e.ends_at ? new Date(e.ends_at) : null,
      status: e.status === "cancelled" ? ("CANCELLED" as const) : ("CONFIRMED" as const),
    })),
  });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, s-maxage=600" } });
}
