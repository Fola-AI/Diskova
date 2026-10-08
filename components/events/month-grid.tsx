import Link from "next/link";

import type { EventCardRow } from "@/lib/db/events";
import { eventDateParts, lagosToday } from "@/lib/events/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month grid (§8.6). Phones show event counts; larger screens show the first titles. */
export function MonthGrid({ month, events, hrefFor }: { month: string; events: EventCardRow[]; hrefFor: (dayKey: string) => string }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday-first
  const byDay = new Map<string, EventCardRow[]>();
  for (const e of events) {
    const k = eventDateParts(e.starts_at, e.timezone).key;
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const today = lagosToday();
  const cells: Array<string | null> = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);

  return (
    <div className="surface overflow-hidden rounded-2xl" data-testid="month-grid">
      <div className="grid grid-cols-7 border-b bg-secondary/50 text-center text-caption font-semibold uppercase tracking-[0.04em] text-muted-foreground" aria-hidden>
        {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((key, i) => {
          if (!key) return <div key={`x${i}`} className="min-h-12 border-b border-r border-border/60 bg-secondary/20 sm:min-h-24" />;
          const list = byDay.get(key) ?? [];
          const isToday = key === today;
          const dayLabel = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));
          return (
            <div key={key} className={cn("relative min-h-12 border-b border-r border-border/60 p-1 sm:min-h-24 sm:p-1.5", list.length && "bg-primary/[0.06]")}>
              {list.length ? (
                <Link href={hrefFor(key)} className="absolute inset-0 sm:hidden" aria-label={`${dayLabel}, ${list.length} ${list.length === 1 ? "event" : "events"}`} />
              ) : null}
              <div className="flex items-start justify-between">
                <span className={cn("grid h-6 min-w-6 place-items-center rounded-full text-caption font-semibold tabular-nums", isToday ? "bg-positive text-background" : "text-foreground/85")} aria-current={isToday ? "date" : undefined}>
                  {Number(key.slice(8))}
                </span>
                {list.length ? (
                  <span aria-hidden className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-caption font-bold leading-none text-accent-foreground sm:hidden">
                    {list.length}
                  </span>
                ) : null}
              </div>
              <ul className="mt-1 hidden space-y-0.5 sm:block">
                {list.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.slug}`} className="block truncate rounded-md bg-primary/15 px-1.5 py-0.5 text-caption hover:bg-primary/25">{e.title}</Link>
                  </li>
                ))}
                {list.length > 3 ? <li><Link href={hrefFor(key)} className="text-caption text-muted-foreground hover:underline">+{list.length - 3} more</Link></li> : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
