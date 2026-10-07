import type { Metadata } from "next";
import { CalendarPlus, Clock, ExternalLink, MapPin, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportButton } from "@/components/feed/report-button";
import { MapToggle } from "@/components/map/map-toggle";
import { TrackClick } from "@/components/analytics/track";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/vendor/share-buttons";
import { BRAND_NAME, MAPBOX_TOKEN, SEASON_NAME, SITE_URL } from "@/lib/config";
import { getEventBySlug } from "@/lib/db/events";
import { staticMapUrl } from "@/lib/directory/links";
import { eventDateParts, eventPrice } from "@/lib/events/format";
import { EVENT_CATEGORIES } from "@/lib/validation/events";
import { AddToNight } from "@/components/lists/add-to-night";

export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const e = await getEventBySlug((await params).slug);
  if (!e) return { title: "Not found" };
  const d = eventDateParts(e.starts_at, e.timezone);
  const title = `${e.title} — ${d.weekday} ${d.day} ${d.month}${e.city ? `, ${e.city.name}` : ""}`;
  const description = (e.description_md ?? `${e.title} at ${e.venue?.name ?? e.venue_name_freeform}`).slice(0, 160);
  return { title, description, alternates: { canonical: `/events/${e.slug}` }, openGraph: { title, description, type: "website" } };
}

export default async function EventPage({ params }: { params: Params }) {
  const e = await getEventBySlug((await params).slug);
  if (!e) notFound();
  const start = eventDateParts(e.starts_at, e.timezone);
  const end = e.ends_at ? eventDateParts(e.ends_at, e.timezone) : null;
  const price = eventPrice(e);
  const point = e.lat !== null && e.lng !== null ? { lat: e.lat, lng: e.lng } : null;
  const url = `${SITE_URL}/events/${e.slug}`;
  const cancelled = e.status === "cancelled";
  // JSON-LD Event (L14 audits structured data across the site)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    startDate: e.starts_at,
    endDate: e.ends_at ?? undefined,
    eventStatus: cancelled ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: e.venue?.name ?? e.venue_name_freeform, address: e.city?.name },
    offers: e.ticket_url ? { "@type": "Offer", url: e.ticket_url, priceCurrency: "NGN", price: e.is_free ? 0 : e.price_from_ngn ?? undefined } : undefined,
  };

  return (
    <article className="pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {e.cover_image_url ? (
        <div className="relative aspect-[16/9] max-h-[380px] w-full overflow-hidden">
          <Image src={e.cover_image_url} alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="container max-w-3xl space-y-6 px-4 pt-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{EVENT_CATEGORIES.find((c) => c.value === e.category)?.label}</Badge>
            {e.is_december_season ? <Badge variant="gold">{SEASON_NAME}</Badge> : null}
            {cancelled ? <Badge variant="destructive">Cancelled</Badge> : null}
          </div>
          <h1 className={`text-3xl font-semibold sm:text-4xl ${cancelled ? "line-through opacity-70" : ""}`}>{e.title}</h1>
          <p className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-positive" aria-hidden />{start.long} · {start.time}{end ? ` – ${end.key === start.key ? end.time : `${end.weekday} ${end.day} ${end.month}, ${end.time}`}` : ""}</p>
          <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-positive" aria-hidden />{e.venue?.name ?? e.venue_name_freeform}{e.area ? `, ${e.area.name}` : ""}{e.city ? `, ${e.city.name}` : ""}</p>
          {price ? <p className="flex items-center gap-2 text-sm"><Ticket className="h-4 w-4 text-positive" aria-hidden />{price}</p> : null}
        </header>

        <div className="flex flex-wrap gap-2">
          {e.ticket_url && !cancelled ? (
            <Button asChild>
              <a href={e.ticket_url} target="_blank" rel="nofollow noopener noreferrer"><ExternalLink aria-hidden />Tickets (external site)</a>
            </Button>
          ) : null}
          <TrackClick event="calendar_added">
            <Button asChild variant="secondary">
              <a href={`/events/${e.slug}/ics`} download><CalendarPlus aria-hidden />Add to calendar</a>
            </Button>
          </TrackClick>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddToNight target={{ eventId: e.id, name: e.title }} />
          <ShareButtons url={url} title={e.title} text={`${e.title} on ${BRAND_NAME}:`} />
        </div>
        <p className="text-xs text-muted-foreground">{BRAND_NAME} doesn&apos;t sell tickets. Ticket links go to the organiser&apos;s own site.</p>

        {e.description_md ? <div className="space-y-3 whitespace-pre-line text-[15px] leading-7 text-muted-foreground">{e.description_md}</div> : null}

        {e.venue_full ? (
          <Link href={`/v/${e.venue_full.slug}`} className="flex gap-3 rounded-xl border bg-card p-3 hover:border-primary/60" data-testid="venue-card">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {e.venue_full.cover_image_url ? <Image src={e.venue_full.cover_image_url} alt="" fill sizes="64px" className="object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{e.venue_full.name}</p>
              <p className="truncate text-sm text-muted-foreground">{e.venue_full.tagline ?? e.venue_full.address_line}</p>
              <p className="text-xs text-positive">See live crowd, prices &amp; directions</p>
            </div>
          </Link>
        ) : null}

        {point ? (
          <MapToggle token={MAPBOX_TOKEN} center={point} zoom={15} points={[{ id: e.id, slug: e.venue_full?.slug ?? "", name: e.venue?.name ?? e.title, lat: point.lat, lng: point.lng }]}
            staticImageUrl={staticMapUrl(MAPBOX_TOKEN, point, { zoom: 15, width: 640, height: 280, pin: true })} />
        ) : null}
        <ReportButton entityType="event" entityId={e.id} label="Report this event" />
      </div>
    </article>
  );
}
