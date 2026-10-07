import { CalendarDays, CalendarHeart, Megaphone, Sparkles, Sun, Trophy } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { preload } from "react-dom";

import { VendorCard } from "@/components/directory/vendor-card";
import { EventCard } from "@/components/events/event-card";
import { MapToggle } from "@/components/map/map-toggle";
import type { MapPoint } from "@/components/map/vendor-map";
import { Avatar } from "@/components/me/avatar";
import { LiveRail } from "@/components/tonight/live-rail";
import { Button } from "@/components/ui/button";
import { DEFAULT_TIMEZONE, FEATURES, MAPBOX_TOKEN, SEASON_NAME } from "@/lib/config";
import { listAreas, listCategories, listVendorsForCity, type CityRow } from "@/lib/db/directory";
import { listEvents } from "@/lib/db/events";
import { getLeaderboard } from "@/lib/db/leaderboard";
import { getCityLive, getUsuallyBusyNow, type LiveVenue } from "@/lib/db/live";
import { getPublicSettings } from "@/lib/db/settings-public";
import { crowdLabel } from "@/lib/directory/crowd";
import { openStatus, parseOpeningHours } from "@/lib/services/opening-hours";

function isSeason(start: string | null, end: string | null, now = new Date()): boolean {
  if (!start || !end) return false;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(now); // YYYY-MM-DD
  return today >= start && today <= end;
}

function Section({ title, icon, href, linkLabel, children }: { title: string; icon: ReactNode; href?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-semibold">{icon}{title}</h2>
        {href ? <Link href={href} className="text-sm text-muted-foreground underline-offset-4 hover:underline">{linkLabel ?? "See all"}</Link> : null}
      </div>
      {children}
    </section>
  );
}

export function livePoints(live: LiveVenue[]): MapPoint[] {
  return live.map((v) => ({ id: v.vendor_id, slug: v.slug, name: v.name, lat: v.lat, lng: v.lng, weight: v.weight, crowd: v.crowd_level_avg }));
}

/** §8.1 Tonight view for one city. Used by `/` (default city) and `/c/[city]`. */
export async function TonightView({ city, mapPoints }: { city: CityRow; mapPoints?: MapPoint[] }) {
  const now = new Date();
  const [live, areas, settings, categories] = await Promise.all([
    getCityLive(city.id),
    listAreas(city.id),
    getPublicSettings(),
    listCategories(),
  ]);
  const [usuallyBusy, leaders, vendors, weekEvents] = await Promise.all([
    live.length ? Promise.resolve([]) : getUsuallyBusyNow(city.id, now),
    FEATURES.points ? getLeaderboard("month", city.id, 5) : Promise.resolve([]),
    listVendorsForCity(city.id, { limit: 500 }),
    listEvents({ cityId: city.id, from: new Date(now.getTime() - 3 * 3600_000), to: new Date(now.getTime() + 7 * 86_400_000), limit: 8 }),
  ]);
  const areaNames = Object.fromEntries(areas.map((a) => [a.id, a.name]));
  const daytimeGroups = new Set(categories.filter((c) => c.group === "daytime" || c.group === "culture").map((c) => c.slug));
  const daytime = vendors
    .filter((v) => v.category && daytimeGroups.has(v.category.slug))
    .sort((a, b) => Number(openStatus(parseOpeningHours(b.opening_hours), now, city.timezone).isOpen) - Number(openStatus(parseOpeningHours(a.opening_hours), now, city.timezone).isOpen))
    .slice(0, 6);
  const season = isSeason(settings.december_season_start, settings.december_season_end, now);
  const dateLabel = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", timeZone: city.timezone }).format(now);
  const center = { lat: city.lat ?? 6.5244, lng: city.lng ?? 3.3792 };
  const points = mapPoints ?? livePoints(live);
  // Same-origin WebP preview (api/map/city), CDN-cached. It's the LCP image on city pages, so React
  // hoists a high-priority preload into <head> ahead of the scripts.
  const mapPreview = city.hero_image_url ?? (MAPBOX_TOKEN ? `/api/map/city/${city.slug}` : null);
  if (points.length && mapPreview) preload(mapPreview, { as: "image", fetchPriority: "high" });

  const emptyState = (
    <div className="space-y-3 text-sm">
      {usuallyBusy.length ? (
        <p>
          <span className="font-medium">Usually busy around now: </span>
          {usuallyBusy.map((u, i) => (
            <span key={u.slug}>
              {i ? ", " : ""}
              <Link href={`/v/${u.slug}`} className="underline underline-offset-4">{u.name}</Link> ({crowdLabel(u.level)?.toLowerCase()})
            </span>
          ))}
          .
        </p>
      ) : null}
      <p className="font-medium">Nothing live in {city.name} yet. Be the first — open a venue and tap to pulse.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link href={`/c/${city.slug}#places`}>Find a venue</Link></Button>
        <Button asChild size="sm" variant="secondary"><Link href="/vendor" prefetch={false}><Megaphone aria-hidden /> Vendors: post an official update</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="relative isolate -mx-4 overflow-hidden px-4 pb-2 pt-6">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_10%_0%,rgba(11,122,59,0.35),transparent_60%),radial-gradient(80%_60%_at_100%_10%,rgba(244,180,0,0.15),transparent_55%)]" />
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Tonight in {city.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="hero-live-count">
          {live.length ? `${live.length} ${live.length === 1 ? "place is" : "places are"} live right now` : "Waiting for the first check-in tonight"}
        </p>
        {season ? (
          <Link href="/events/december" className="mt-4 flex items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 p-3 text-sm" data-testid="season-banner">
            <CalendarHeart className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            <span><strong>{SEASON_NAME}</strong> is on — see what&apos;s happening this week.</span>
          </Link>
        ) : null}
      </header>

      <LiveRail citySlug={city.slug} initial={live} areaNames={areaNames} emptyState={emptyState} />

      {points.length ? (
        <MapToggle
          token={MAPBOX_TOKEN}
          center={center}
          zoom={11}
          heat
          eager
          points={points}
          staticImageUrl={mapPreview}
          label={live.length ? "Heat map" : "Map"}
        />
      ) : null}

      {weekEvents.length ? (
        <Section title="This week" icon={<CalendarDays className="h-5 w-5 text-accent" aria-hidden />} href={`/events?city=${city.slug}`} linkLabel="All events">
          <ul className="grid gap-2 sm:grid-cols-2">
            {weekEvents.map((e) => <li key={e.id}><EventCard event={e} /></li>)}
          </ul>
        </Section>
      ) : null}

      {daytime.length ? (
        <Section title="Daytime picks" icon={<Sun className="h-5 w-5 text-accent" aria-hidden />} href={`/c/${city.slug}#places`}>
          <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {daytime.map((v) => (
              <li key={v.id} className="w-64 shrink-0"><VendorCard vendor={v} /></li>
            ))}
          </ul>
        </Section>
      ) : null}

      {leaders.length ? (
        <Section title="Top this month" icon={<Trophy className="h-5 w-5 text-accent" aria-hidden />} href={`/leaderboard/${city.slug}`} linkLabel="Leaderboard">
          <ol className="divide-y rounded-xl border bg-card">
            {leaders.map((r) => (
              <li key={r.username} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="w-4 text-right font-semibold">{r.rank}</span>
                <Avatar url={r.avatar_url} name={r.display_name ?? r.username} size={28} />
                <Link href={`/u/${r.username}`} className="min-w-0 flex-1 truncate hover:underline">{r.display_name ?? r.username}</Link>
                <span className="font-semibold tabular-nums">{r.points}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden /> Check in to top the {city.name} leaderboard this month.
        </p>
      )}
    </div>
  );
}
