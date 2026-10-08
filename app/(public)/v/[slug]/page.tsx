import type { Metadata } from "next";
import { AtSign, BadgeCheck, CalendarDays, ChevronRight, MapPin, Megaphone, Shirt, Store, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryIcon, categoryGradient } from "@/components/directory/category-icon";
import { LazyCheckinSheet } from "@/components/feed/lazy";
import { LiveFeed } from "@/components/feed/live-feed";
import { PulseBar } from "@/components/feed/pulse-bar";
import { OpenStatusBadge } from "@/components/directory/open-status-badge";
import { MapToggle } from "@/components/map/map-toggle";
import { Badge } from "@/components/ui/badge";
import { ActionRow } from "@/components/vendor/action-row";
import { HoursTable } from "@/components/vendor/hours-table";
import { Section } from "@/components/vendor/section";
import { ShareButtons } from "@/components/vendor/share-buttons";
import { StickyTitle } from "@/components/vendor/sticky-title";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, vendorJsonLd } from "@/lib/content/jsonld";
import { BRAND_NAME, DEFAULT_TIMEZONE, FEATURES as FEATURE_FLAGS, MAPBOX_TOKEN, SITE_URL } from "@/lib/config";
import { getVendorBySlug, listRecentOfficialUpdates, listUpcomingEventsForVendor, listVendorPrices } from "@/lib/db/directory";
import { FEATURES, formatNaira, priceBandSymbol, PRICE_BANDS } from "@/lib/directory/constants";
import { instagramUrl } from "@/lib/directory/links";
import { listCommunityPhotos, listVendorFeed } from "@/lib/db/feed";
import { getVendorForecast, getVendorLive } from "@/lib/db/live";
import { CrowdBadge } from "@/components/tonight/crowd-badge";
import { crowdLabel } from "@/lib/directory/crowd";
import { formatTime } from "@/lib/services/opening-hours";
import { hasAnyHours, parseOpeningHours } from "@/lib/services/opening-hours";
import { AddToNight } from "@/components/lists/add-to-night";
import { QaList } from "@/components/qa/qa-list";
import { listQuestions } from "@/lib/services/qa";

export const revalidate = 60;
export async function generateStaticParams() {
  return []; // rendered on first request, then cached (ISR)
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const vendor = await getVendorBySlug((await params).slug);
  if (!vendor) return { title: "Not found" };
  const place = [vendor.area?.name, vendor.city?.name].filter(Boolean).join(", ");
  const title = `${vendor.name} — ${vendor.category?.name ?? "Venue"}${place ? ` in ${place}` : ""}`;
  const description =
    vendor.tagline ?? `${vendor.name}: live crowd level, prices, opening hours and directions on ${BRAND_NAME}.`;
  return {
    title,
    description,
    alternates: { canonical: `/v/${vendor.slug}` },
    openGraph: { title, description, type: "website", url: `/v/${vendor.slug}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

function paragraphs(text: string | null): string[] {
  return (text ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export default async function VendorPage({ params }: { params: Params }) {
  const vendor = await getVendorBySlug((await params).slug);
  if (!vendor) notFound();

  const [prices, events, officialUpdates, feed, communityPhotos, liveNow, forecast, questions] = await Promise.all([
    listVendorPrices(vendor.id),
    listUpcomingEventsForVendor(vendor.id),
    listRecentOfficialUpdates(vendor.id),
    listVendorFeed(vendor.id),
    listCommunityPhotos(vendor.id),
    getVendorLive(vendor.id),
    FEATURE_FLAGS.crowdForecast ? getVendorForecast(vendor.id) : Promise.resolve(null),
    FEATURE_FLAGS.qa ? listQuestions({ vendorId: vendor.id }, 10) : Promise.resolve([]),
  ]);
  const timeZone = vendor.city?.timezone ?? DEFAULT_TIMEZONE;
  const hours = parseOpeningHours(vendor.opening_hours);
  const price = priceBandSymbol(vendor.price_band);
  const priceLabel = PRICE_BANDS.find((p) => p.value === vendor.price_band)?.label;
  const url = `${SITE_URL}/v/${vendor.slug}`;
  const point = vendor.lat !== null && vendor.lng !== null ? { lat: vendor.lat, lng: vendor.lng } : null;
  const insta = instagramUrl(vendor.instagram_handle);
  const features = vendor.features.filter((f) => FEATURES[f]);

  return (
    <article className="pb-6">
      <JsonLd
        data={[
          vendorJsonLd({ ...vendor, price_symbol: price, instagram_url: insta, opening_hours: hours, features }),
          breadcrumbJsonLd([
            ...(vendor.city ? [{ name: vendor.city.name, path: `/c/${vendor.city.slug}` }] : []),
            { name: vendor.name, path: `/v/${vendor.slug}` },
          ]),
        ]}
      />
      {/* 1. Cover — vendor photos (community photos join in Stage L6) */}
      <StickyTitle watchId="venue-title">
        <span className="min-w-0 flex-1 truncate font-display text-callout font-semibold">{vendor.name}</span>
        {liveNow ? <CrowdBadge level={Number(liveNow.crowd_level_avg)} confidence={liveNow.confidence} /> : null}
      </StickyTitle>
      <div
        className={vendor.cover_image_url ? "relative aspect-[16/9] max-h-[440px] w-full overflow-hidden sm:aspect-[21/9]" : "relative h-36 w-full overflow-hidden sm:h-48"}
        style={{ background: categoryGradient(vendor.category?.slug) }}
      >
        {vendor.cover_image_url ? (
          <Image src={vendor.cover_image_url} alt={`${vendor.name}`} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <CategoryIcon icon={vendor.category?.icon} className="absolute right-5 top-5 h-14 w-14 text-white/25" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>
      {communityPhotos.length ? (
        <ul className="rail fade-x relative z-10 -mt-6 gap-2 px-4 pb-1" aria-label="Community photos">
          {communityPhotos.map((m) => (
            <li key={m.url} className="relative h-28 w-40 shrink-0 overflow-hidden rounded-2xl bg-secondary ring-1 ring-white/10">
              <Image src={m.url} alt="Community photo" fill sizes="160px" className="object-cover" {...(m.placeholder ? { placeholder: "blur" as const, blurDataURL: m.placeholder } : {})} />
              <span className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-black/65 px-2 py-1 text-caption font-medium leading-tight text-white backdrop-blur-md">Community photo · Unverified</span>
            </li>
          ))}
          <li aria-hidden className="w-2 shrink-0" />
        </ul>
      ) : null}

      <div className="container max-w-3xl space-y-10 px-4">
        {/* 2. Header */}
        <header className="relative -mt-8 space-y-3">
          <Breadcrumbs
            items={[
              ...(vendor.city ? [{ href: `/c/${vendor.city.slug}`, label: vendor.city.name }] : []),
              ...(vendor.area ? [{ label: vendor.area.name }] : []),
            ]}
            className="-mb-1"
          />
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-footnote font-medium text-muted-foreground">
              <CategoryIcon icon={vendor.category?.icon} className="h-4 w-4" />
              {vendor.category?.name}
            </p>
            <h1 id="venue-title" className="flex flex-wrap items-center gap-2 text-display font-semibold sm:text-display-lg">
              {vendor.name}
              {vendor.verified ? (
                <Badge variant="positive" className="font-sans">
                  <BadgeCheck aria-hidden /> Verified
                </Badge>
              ) : null}
            </h1>
            {vendor.tagline ? <p className="text-callout text-muted-foreground">{vendor.tagline}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {liveNow ? (
              <span data-testid="vendor-crowd"><CrowdBadge level={Number(liveNow.crowd_level_avg)} confidence={liveNow.confidence} className="bg-secondary ring-0" /></span>
            ) : null}
            <OpenStatusBadge hours={vendor.opening_hours} timeZone={timeZone} className="text-sm" />
            {price ? (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-caption" title={priceLabel}>
                <span className="font-semibold">{price}</span>
                <span className="text-muted-foreground"> {priceLabel}</span>
              </span>
            ) : null}
          </div>
          {forecast ? (
            <p className="text-sm text-muted-foreground" data-testid="forecast-line">
              Usually {crowdLabel(forecast.level)?.toLowerCase()} around {formatTime(`${String(forecast.hour).padStart(2, "0")}:00`)} on{" "}
              {["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][forecast.weekday]}
            </p>
          ) : null}
        </header>

        {/* 3. Action row */}
        <div className="space-y-2.5">
          <ActionRow
            name={vendor.name}
            lat={vendor.lat}
            lng={vendor.lng}
            whatsapp={vendor.whatsapp}
            phone={vendor.phone}
            websiteUrl={vendor.website_url}
            bookingUrl={vendor.booking_url}
          />
          <div className="flex gap-2">
            <AddToNight target={{ vendorId: vendor.id, name: vendor.name }} label="Save" className="flex-1 px-3" />
            <ShareButtons compact url={url} title={vendor.name} text={`${vendor.name} on ${BRAND_NAME}:`} className="flex-[2]" />
          </div>
        </div>

        {/* Pulse (one tap) + check-in for details */}
        <div className="space-y-2.5">
          <PulseBar vendorId={vendor.id} vendorSlug={vendor.slug} />
          <LazyCheckinSheet vendorId={vendor.id} vendorSlug={vendor.slug} vendorName={vendor.name} />
        </div>

        {/* 4. Live feed — official updates pinned 24 h, then community posts (Realtime / polling) */}
        <LiveFeed vendorId={vendor.id} vendorSlug={vendor.slug} verified={vendor.verified} initial={{ feed, official: officialUpdates }} />

        {/* 5. Prices · dress code · age policy */}
        <Section title="Prices" id="prices">
          {prices.length ? (
            <ul className="surface divide-y overflow-hidden rounded-2xl">
              {prices.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-4 px-4 py-3.5 text-[15px]">
                  <span className="min-w-0">
                    {p.label}
                    {p.note ? <span className="mt-0.5 block text-footnote text-muted-foreground">{p.note}</span> : null}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatNaira(p.amount_ngn)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              No prices listed yet.{" "}
              <Link href="/vendor" prefetch={false} className="font-medium text-foreground underline underline-offset-4">Own this venue? Add your prices.</Link>
            </p>
          )}
          {vendor.dress_code || vendor.age_policy ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {vendor.dress_code ? (
                <div className="surface rounded-2xl p-4">
                  <dt className="flex items-center gap-2 font-semibold">
                    <Shirt className="h-4 w-4 shrink-0 text-positive" aria-hidden /> Dress code
                  </dt>
                  <dd className="mt-1 text-muted-foreground">{vendor.dress_code}</dd>
                </div>
              ) : null}
              {vendor.age_policy ? (
                <div className="surface rounded-2xl p-4">
                  <dt className="flex items-center gap-2 font-semibold">
                    <Ticket className="h-4 w-4 shrink-0 text-positive" aria-hidden /> Age policy
                  </dt>
                  <dd className="mt-1 text-muted-foreground">{vendor.age_policy}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </Section>

        {/* 6. About, features, hours, parking, late-night note */}
        <Section title="About" id="about">
          <div className="prose-reading space-y-3 text-[15px] leading-7 text-foreground/80">
            {paragraphs(vendor.description_md).map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
          {features.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Features">
              {features.map((f) => (
                <li key={f}><Badge variant="secondary">{FEATURES[f]}</Badge></li>
              ))}
            </ul>
          ) : null}
          {insta ? (
            <a href={insta} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline underline-offset-4">
              <AtSign className="h-4 w-4" aria-hidden /> {vendor.instagram_handle?.replace(/^@/, "")} on Instagram
            </a>
          ) : null}
        </Section>

        {hasAnyHours(hours) ? (
          <Section title="Opening hours" id="hours">
            <div className="surface overflow-hidden rounded-2xl">
              <HoursTable hours={hours} timeZone={timeZone} />
            </div>
            <p className="text-footnote text-muted-foreground">Times are local ({timeZone.replace("_", " ")}).</p>
          </Section>
        ) : null}

        <Section title="Getting there" id="location">
          {vendor.address_line ? (
            <p className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden /> {vendor.address_line}
            </p>
          ) : null}
          {vendor.parking_note ? <p className="text-sm"><span className="font-medium">Parking:</span> {vendor.parking_note}</p> : null}
          {vendor.late_night_area_note ? (
            <p className="text-sm"><span className="font-medium">Late night:</span> {vendor.late_night_area_note}</p>
          ) : null}
          {point ? (
            <MapToggle
              token={MAPBOX_TOKEN}
              center={point}
              zoom={15}
              staticImageUrl={MAPBOX_TOKEN ? `/api/map/vendor/${vendor.slug}` : null}
              points={[{ id: vendor.id, slug: vendor.slug, name: vendor.name, lat: point.lat, lng: point.lng }]}
            />
          ) : null}
        </Section>

        {/* 7. Upcoming events */}
        {events.length ? (
          <Section title="Upcoming events" id="events">
            <ul className="surface divide-y overflow-hidden rounded-2xl">
              {events.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.slug}`} className="flex min-h-14 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-secondary/60 active:bg-secondary">
                    <CalendarDays className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block text-footnote text-muted-foreground">
                        {new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone }).format(new Date(e.starts_at))}
                        {e.is_free ? " · Free" : e.price_from_ngn ? ` · from ${formatNaira(e.price_from_ngn)}` : ""}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {FEATURE_FLAGS.qa ? (
          <Section title="Questions & answers" id="questions">
            <QaList questions={questions} scope={{ vendorId: vendor.id }} path={`/v/${vendor.slug}`} askLabel={`Ask about ${vendor.name}`} />
          </Section>
        ) : null}

        {vendor.claim_status === "unclaimed" ? (
          <div className="surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Store className="h-5 w-5" aria-hidden />
            </span>
            <p className="flex-1 text-sm text-muted-foreground">
              <span className="block font-semibold text-foreground">Is this your venue?</span>
              Listing is free. Post official updates and keep prices right.
            </p>
            <Button asChild variant="secondary">
              <Link href={`/vendor/onboarding?claim=${vendor.slug}`}>
                <Megaphone aria-hidden /> Claim this venue
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
