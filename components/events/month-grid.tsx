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
    <div className="overflow-hidden rounded-xl border" data-testid="month-grid">
      <div className="grid grid-cols-7 border-b bg-secondary/60 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => <div key={d} className="py-1.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((key, i) => {
          if (!key) return <div key={`x${i}`} className="min-h-14 border-b border-r bg-secondary/20 sm:min-h-24" />;
          const list = byDay.get(key) ?? [];
          return (
            <div key={key} className={cn("min-h-14 border-b border-r p-1 sm:min-h-24", key === today && "bg-primary/10")}>
              <div className="flex items-center justify-between text-[11px]">
                <span className={cn("font-medium", key === today && "text-positive")}>{Number(key.slice(8))}</span>
                {list.length ? (
                  <Link href={hrefFor(key)} className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground sm:hidden" aria-label={`${list.length} events`}>
                    {list.length}
                  </Link>
                ) : null}
              </div>
              <ul className="mt-1 hidden space-y-0.5 sm:block">
                {list.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.slug}`} className="block truncate rounded bg-primary/15 px-1 text-[11px] hover:bg-primary/25">{e.title}</Link>
                  </li>
                ))}
                {list.length > 3 ? <li><Link href={hrefFor(key)} className="text-[11px] text-muted-foreground hover:underline">+{list.length - 3} more</Link></li> : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
