import type { Metadata } from "next";
import { AtSign, BadgeCheck, MapPin, Shirt, Ticket } from "lucide-react";
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
      <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden sm:aspect-[21/9]" style={{ background: categoryGradient(vendor.category?.slug) }}>
        {vendor.cover_image_url ? (
          <Image src={vendor.cover_image_url} alt={`${vendor.name}`} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <CategoryIcon icon={vendor.category?.icon} className="absolute bottom-4 right-4 h-16 w-16 text-white/20" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
      </div>
      {communityPhotos.length ? (
        <ul className="flex gap-1 overflow-x-auto px-4 pt-2 [scrollbar-width:none]" aria-label="Community photos">
          {communityPhotos.map((m) => (
            <li key={m.url} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <Image src={m.url} alt="Community photo" fill sizes="128px" className="object-cover" {...(m.placeholder ? { placeholder: "blur" as const, blurDataURL: m.placeholder } : {})} />
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[9px] font-medium text-white">Community photo · Unverified</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="container max-w-3xl space-y-8 px-4">
        {/* 2. Header */}
        <header className="-mt-10 relative space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CategoryIcon icon={vendor.category?.icon} className="h-4 w-4" />
              {vendor.category?.name}
            </span>
            {vendor.area ? <span>· {vendor.area.name}</span> : null}
            {vendor.city ? (
              <Link href={`/c/${vendor.city.slug}`} className="underline-offset-4 hover:underline">· {vendor.city.name}</Link>
            ) : null}
          </div>
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-semibold sm:text-4xl">
            {vendor.name}
            {vendor.verified ? (
              <Badge variant="default" className="gap-1 text-[11px]">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified
              </Badge>
            ) : null}
          </h1>
          {vendor.tagline ? <p className="text-muted-foreground">{vendor.tagline}</p> : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {liveNow ? (
              <span data-testid="vendor-crowd"><CrowdBadge level={Number(liveNow.crowd_level_avg)} confidence={liveNow.confidence} /></span>
            ) : null}
            <OpenStatusBadge hours={vendor.opening_hours} timeZone={timeZone} className="text-sm" />
            {price ? (
              <span className="text-sm" title={priceLabel}>
                <span className="font-semibold">{price}</span>
                <span className="sr-only"> {priceLabel}</span>
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
        <div className="space-y-3">
          <ActionRow
            name={vendor.name}
            lat={vendor.lat}
            lng={vendor.lng}
            whatsapp={vendor.whatsapp}
            phone={vendor.phone}
            websiteUrl={vendor.website_url}
            bookingUrl={vendor.booking_url}
          />
          <div className="flex flex-wrap items-center gap-2">
            <AddToNight target={{ vendorId: vendor.id, name: vendor.name }} />
            <ShareButtons url={url} title={vendor.name} text={`${vendor.name} on ${BRAND_NAME}:`} />
          </div>
        </div>

        {/* Pulse (one tap) + check-in */}
        <div className="space-y-3">
          <PulseBar vendorId={vendor.id} vendorSlug={vendor.slug} />
          <LazyCheckinSheet vendorId={vendor.id} vendorSlug={vendor.slug} vendorName={vendor.name} />
        </div>

        {/* 4. Live feed — official updates pinned 24 h, then community posts (Realtime / polling) */}
        <LiveFeed vendorId={vendor.id} vendorSlug={vendor.slug} verified={vendor.verified} initial={{ feed, official: officialUpdates }} />

        {/* 5. Prices · dress code · age policy */}
        <Section title="Prices" id="prices">
          {prices.length ? (
            <ul className="divide-y rounded-xl border bg-card">
              {prices.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                  <span>
                    {p.label}
                    {p.note ? <span className="block text-xs text-muted-foreground">{p.note}</span> : null}
                  </span>
                  <span className="shrink-0 font-semibold">{formatNaira(p.amount_ngn)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No prices listed yet.{" "}
              <Link href="/vendor" prefetch={false} className="text-foreground underline underline-offset-4">Own this venue? Add your prices.</Link>
            </p>
          )}
          {vendor.dress_code || vendor.age_policy ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {vendor.dress_code ? (
                <div className="rounded-lg border p-3">
                  <dt className="flex items-center gap-2 font-medium">
                    <Shirt className="h-4 w-4 shrink-0 text-positive" aria-hidden /> Dress code
                  </dt>
                  <dd className="mt-1 text-muted-foreground">{vendor.dress_code}</dd>
                </div>
              ) : null}
              {vendor.age_policy ? (
                <div className="rounded-lg border p-3">
                  <dt className="flex items-center gap-2 font-medium">
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
          <div className="space-y-3 text-[15px] leading-7 text-muted-foreground">
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
            <a href={insta} target="_blank" rel="nofollow noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">
              <AtSign className="h-4 w-4" aria-hidden /> {vendor.instagram_handle?.replace(/^@/, "")} on Instagram
            </a>
          ) : null}
        </Section>

        {hasAnyHours(hours) ? (
          <Section title="Opening hours" id="hours">
            <div className="rounded-xl border bg-card px-4">
              <HoursTable hours={hours} timeZone={timeZone} />
            </div>
            <p className="text-xs text-muted-foreground">Times are local ({timeZone.replace("_", " ")}).</p>
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
            <ul className="divide-y rounded-xl border bg-card">
              {events.map((e) => (
                <li key={e.id} className="px-4 py-3 text-sm">
                  <span className="font-medium">{e.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone }).format(new Date(e.starts_at))}
                    {e.is_free ? " · Free" : e.price_from_ngn ? ` · from ${formatNaira(e.price_from_ngn)}` : ""}
                  </span>
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
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Is this your venue? Listing is free.{" "}
            <Link href={`/vendor/onboarding?claim=${vendor.slug}`} className="text-foreground underline underline-offset-4">
              Claim it to post official updates.
            </Link>
          </p>
        ) : null}
      </div>
    </article>
  );
}
