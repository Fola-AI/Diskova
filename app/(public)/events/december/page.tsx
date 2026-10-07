import type { Metadata } from "next";
import { CalendarHeart } from "lucide-react";
import Link from "next/link";

import { Countdown } from "@/components/events/countdown";
import { EventFiltersBar } from "@/components/events/event-filters";
import { EventList } from "@/components/events/event-list";
import { SEASON_NAME } from "@/lib/config";
import { listCities } from "@/lib/db/directory";
import { listEvents, type EventCategoryEnum } from "@/lib/db/events";
import { getPublicSettings } from "@/lib/db/settings-public";
import { lagosToday } from "@/lib/events/format";
import { lagosStartOf, parseEventFilters } from "@/lib/events/query";

export const metadata: Metadata = {
  title: `${SEASON_NAME} — events calendar`,
  description: `Every party, concert, beach day and festival for ${SEASON_NAME} in Lagos, Abuja and beyond.`,
  alternates: { canonical: "/events/december" },
};

export default async function DecemberPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseEventFilters(await searchParams);
  const [cities, settings] = await Promise.all([listCities(), getPublicSettings()]);
  const city = cities.find((c) => c.slug === filters.city);
  const start = settings.december_season_start;
  const end = settings.december_season_end;
  const today = lagosToday();
  const before = start ? today < start : false;
  const from = lagosStartOf(before || !start ? (start ?? today) : today);
  const events = await listEvents({ from, seasonOnly: true, cityId: city?.id, category: filters.category as EventCategoryEnum | undefined, limit: 500 });
  const fmt = (d: string) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

  return (
    <div className="container max-w-4xl space-y-6 px-4 py-6">
      <header className="relative isolate -mx-4 space-y-3 overflow-hidden px-4 py-6">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(100%_80%_at_0%_0%,rgba(244,180,0,0.25),transparent_60%),radial-gradient(80%_70%_at_100%_0%,rgba(11,122,59,0.35),transparent_60%)]" />
        <p className="inline-flex items-center gap-2 text-sm text-accent"><CalendarHeart className="h-4 w-4" aria-hidden /> {start && end ? `${fmt(start)} – ${fmt(end)}` : "Dates coming soon"}</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">{SEASON_NAME}</h1>
        <p className="max-w-xl text-muted-foreground">Concerts, beach parties, boat cruises, comedy and festivals — everything happening across Nigeria this season, in one calendar.</p>
        {start && before ? <Countdown target={`${start}T00:00:00+01:00`} label="The season starts in" /> : null}
        {start && end && !before && today <= end ? <p className="font-medium">It&apos;s on. {events.length} events still to come.</p> : null}
      </header>
      <EventFiltersBar basePath="/events/december" filters={filters} cities={cities} showView={false} />
      {events.length ? (
        <EventList events={events} showCity={!city} />
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          The calendar is filling up. Organising something? <Link href="/events/submit" className="underline">Submit your event</Link>.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Subscribe: <a href={`/events/calendar.ics?season=december${city ? `&city=${city.slug}` : ""}`} className="underline underline-offset-4">iCal feed</a>
      </p>
    </div>
  );
}
