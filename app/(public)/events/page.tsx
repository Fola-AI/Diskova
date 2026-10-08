import type { Metadata } from "next";
import { CalendarHeart, CalendarPlus, CalendarX2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { EventFiltersBar } from "@/components/events/event-filters";
import { EventList } from "@/components/events/event-list";
import { MonthGrid } from "@/components/events/month-grid";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SEASON_NAME } from "@/lib/config";
import { listCities } from "@/lib/db/directory";
import { listEvents, type EventCategoryEnum } from "@/lib/db/events";
import { lagosToday } from "@/lib/events/format";
import { currentMonth, lagosStartOf, monthRange, parseEventFilters, shiftMonth, toQuery } from "@/lib/events/query";

export const metadata: Metadata = {
  title: "Events",
  description: `Concerts, parties, beach days, comedy and festivals across Nigeria — including the ${SEASON_NAME} calendar.`,
  alternates: { canonical: "/events" },
};

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseEventFilters(await searchParams);
  const cities = await listCities();
  const city = cities.find((c) => c.slug === filters.city);
  const month = filters.month ?? currentMonth();
  const isMonth = filters.view === "month";
  const range = isMonth ? monthRange(month) : { from: lagosStartOf(lagosToday()), to: undefined };
  const events = await listEvents({ ...range, cityId: city?.id, category: filters.category as EventCategoryEnum | undefined });
  const monthLabel = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));

  return (
    <div className="container max-w-4xl space-y-5 px-4 py-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-display font-semibold sm:text-display-lg">Events{city ? ` in ${city.name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">{events.length} {isMonth ? `in ${monthLabel}` : "coming up"}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button asChild variant="gold" size="sm"><Link href="/events/december"><CalendarHeart aria-hidden />{SEASON_NAME}</Link></Button>
          <Button asChild variant="secondary" size="sm"><Link href="/events/submit"><Plus aria-hidden />Submit an event</Link></Button>
        </div>
      </div>
      <EventFiltersBar basePath="/events" filters={filters} cities={cities} />
      {isMonth ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button asChild variant="secondary" size="icon" className="rounded-full"><Link href={`/events${toQuery(filters, { month: shiftMonth(month, -1) })}`} aria-label="Previous month"><ChevronLeft aria-hidden /></Link></Button>
            <h2 className="text-title font-semibold" aria-live="polite">{monthLabel}</h2>
            <Button asChild variant="secondary" size="icon" className="rounded-full"><Link href={`/events${toQuery(filters, { month: shiftMonth(month, 1) })}`} aria-label="Next month"><ChevronRight aria-hidden /></Link></Button>
          </div>
          <MonthGrid month={month} events={events} hrefFor={(day) => `/events${toQuery(filters, { view: "month", month })}#d-${day}`} />
          <EventList events={events} showCity={!city} />
        </div>
      ) : events.length ? (
        <EventList events={events} showCity={!city} />
      ) : (
        <EmptyState
          icon={CalendarX2}
          title="No upcoming events yet"
          action={<Button asChild><Link href="/events/submit"><Plus aria-hidden /> Submit an event</Link></Button>}
        >
          Know something happening{city ? ` in ${city.name}` : ""}? Add it — it&apos;s free.
        </EmptyState>
      )}
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <a href={`/events/calendar.ics${city ? `?city=${city.slug}` : ""}`}>
          <CalendarPlus aria-hidden /> Add to my calendar (iCal)
        </a>
      </Button>
    </div>
  );
}
