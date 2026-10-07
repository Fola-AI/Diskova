import { CalendarDays, List } from "lucide-react";
import Link from "next/link";

import type { CityRow } from "@/lib/db/directory";
import { toQuery, type EventFilters } from "@/lib/events/query";
import { cn } from "@/lib/utils";
import { EVENT_CATEGORIES } from "@/lib/validation/events";

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} scroll={false}
      className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60")}>
      {children}
    </Link>
  );
}

export function EventFiltersBar({ basePath, filters, cities, showView = true }: { basePath: string; filters: EventFilters; cities: CityRow[]; showView?: boolean }) {
  return (
    <div className="space-y-2">
      <nav aria-label="City" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip href={`${basePath}${toQuery(filters, { city: undefined })}`} active={!filters.city}>All cities</Chip>
        {cities.map((c) => <Chip key={c.slug} href={`${basePath}${toQuery(filters, { city: c.slug })}`} active={filters.city === c.slug}>{c.name}</Chip>)}
      </nav>
      <nav aria-label="Category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip href={`${basePath}${toQuery(filters, { category: undefined })}`} active={!filters.category}>Everything</Chip>
        {EVENT_CATEGORIES.map((c) => <Chip key={c.value} href={`${basePath}${toQuery(filters, { category: c.value })}`} active={filters.category === c.value}>{c.label}</Chip>)}
      </nav>
      {showView ? (
        <div className="flex gap-2">
          <Chip href={`${basePath}${toQuery(filters, { view: undefined, month: undefined })}`} active={filters.view !== "month"}><List className="h-4 w-4" aria-hidden />List</Chip>
          <Chip href={`${basePath}${toQuery(filters, { view: "month" })}`} active={filters.view === "month"}><CalendarDays className="h-4 w-4" aria-hidden />Month</Chip>
        </div>
      ) : null}
    </div>
  );
}
