import { NextResponse } from "next/server";

import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { getEventBySlug } from "@/lib/db/events";
import { buildCalendar } from "@/lib/events/ical";

/** Single-event .ics (§8.6). */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const e = await getEventBySlug((await params).slug);
  if (!e) return new NextResponse("Not found", { status: 404 });
  const host = new URL(SITE_URL).host;
  const ics = buildCalendar({
    name: e.title,
    prodId: `-//${BRAND_NAME}//Events//EN`,
    events: [
      {
        uid: `${e.id}@${host}`,
        title: e.title,
        description: e.description_md,
        location: [e.venue?.name ?? e.venue_name_freeform, e.area?.name, e.city?.name].filter(Boolean).join(", "),
        url: `${SITE_URL}/events/${e.slug}`,
        start: new Date(e.starts_at),
        end: e.ends_at ? new Date(e.ends_at) : null,
        updated: new Date(e.updated_at),
        status: e.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
      },
    ],
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${e.slug}.ics"`,
      "Cache-Control": "public, s-maxage=300",
    },
  });
}
