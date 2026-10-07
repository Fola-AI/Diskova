import { EventCard } from "@/components/events/event-card";
import type { EventCardRow } from "@/lib/db/events";
import { eventDateParts } from "@/lib/events/format";

/** Events grouped by local date. Cards use content-visibility so hundreds of events stay smooth. */
export function EventList({ events, showCity }: { events: EventCardRow[]; showCity?: boolean }) {
  if (!events.length) return null;
  const groups = new Map<string, { label: string; events: EventCardRow[] }>();
  for (const e of [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const d = eventDateParts(e.starts_at, e.timezone);
    const g = groups.get(d.key) ?? { label: d.long, events: [] };
    g.events.push(e);
    groups.set(d.key, g);
  }
  return (
    <div className="space-y-6" data-testid="event-list">
      {[...groups.entries()].map(([key, g]) => (
        <section key={key} id={`d-${key}`} className="scroll-mt-20 space-y-2" aria-label={g.label}>
          <h3 className="sticky top-14 z-10 -mx-4 bg-background/95 px-4 py-1.5 font-sans text-sm font-semibold tracking-normal backdrop-blur">{g.label}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {g.events.map((e) => <li key={e.id}><EventCard event={e} showCity={showCity} /></li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
