import { CalendarDays, List } from "lucide-react";
import Link from "next/link";

import { CityPicker } from "@/components/events/city-picker";
import { chipClass } from "@/components/ui/chip";
import { SegmentedLinks } from "@/components/ui/segmented-links";
import type { CityRow } from "@/lib/db/directory";
import { toQuery, type EventFilters } from "@/lib/events/query";
import { EVENT_CATEGORIES } from "@/lib/validation/events";

/** One row: city picker chip + category chips; List / Month as a segmented control. */
export function EventFiltersBar({ basePath, filters, cities, showView = true }: { basePath: string; filters: EventFilters; cities: CityRow[]; showView?: boolean }) {
  const cityOptions = [
    { label: "All cities", value: null, href: `${basePath}${toQuery(filters, { city: undefined })}` },
    ...cities.map((c) => ({ label: c.name, value: c.slug, href: `${basePath}${toQuery(filters, { city: c.slug })}` })),
  ];
  return (
    <div className="space-y-3">
      <nav aria-label="Filter events" className="rail fade-x -mx-4 gap-2 px-4 py-1">
        <CityPicker current={filters.city ?? null} options={cityOptions} />
        <span aria-hidden className="my-2 w-px shrink-0 bg-border" />
        <Link href={`${basePath}${toQuery(filters, { category: undefined })}`} scroll={false} aria-current={!filters.category ? "page" : undefined} className={chipClass(!filters.category)}>
          Everything
        </Link>
        {EVENT_CATEGORIES.map((c) => (
          <Link key={c.value} href={`${basePath}${toQuery(filters, { category: c.value })}`} scroll={false} aria-current={filters.category === c.value ? "page" : undefined} className={chipClass(filters.category === c.value)}>
            {c.label}
          </Link>
        ))}
        <span className="w-2 shrink-0" aria-hidden />
      </nav>
      {showView ? (
        <SegmentedLinks
          label="View"
          className="w-full sm:w-auto"
          items={[
            { href: `${basePath}${toQuery(filters, { view: undefined, month: undefined })}`, label: <><List className="h-4 w-4" aria-hidden />List</>, active: filters.view !== "month" },
            { href: `${basePath}${toQuery(filters, { view: "month" })}`, label: <><CalendarDays className="h-4 w-4" aria-hidden />Month</>, active: filters.view === "month" },
          ]}
        />
      ) : null}
    </div>
  );
}
