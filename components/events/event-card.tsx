import { CalendarHeart, MapPin, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { SEASON_NAME } from "@/lib/config";
import type { EventCardRow } from "@/lib/db/events";
import { eventDateParts, eventPrice } from "@/lib/events/format";
import { EVENT_CATEGORIES } from "@/lib/validation/events";

export function EventCard({ event, showCity = false }: { event: EventCardRow; showCity?: boolean }) {
  const d = eventDateParts(event.starts_at, event.timezone);
  const price = eventPrice(event);
  const cancelled = event.status === "cancelled";
  return (
    <Link
      href={`/events/${event.slug}`}
      className="flex gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/60 [content-visibility:auto] [contain-intrinsic-size:auto_96px]"
      data-testid="event-card"
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-secondary py-2 text-center">
        <span className="text-[11px] uppercase text-muted-foreground">{d.month}</span>
        <span className="font-display text-2xl font-semibold leading-none">{d.day}</span>
        <span className="text-[11px] text-muted-foreground">{d.weekday}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.is_featured ? <Badge variant="gold" className="gap-1 text-[10px]"><Star className="h-3 w-3" aria-hidden />Featured</Badge> : null}
          {cancelled ? <Badge variant="destructive" className="text-[10px]">Cancelled</Badge> : null}
          {event.is_december_season ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-accent"><CalendarHeart className="h-3 w-3" aria-hidden />{SEASON_NAME}</span>
          ) : null}
        </div>
        <p className={`truncate font-semibold ${cancelled ? "line-through opacity-70" : ""}`}>{event.title}</p>
        <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {event.venue?.name ?? event.venue_name_freeform}
          {showCity && event.city ? ` · ${event.city.name}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {d.time} · {EVENT_CATEGORIES.find((c) => c.value === event.category)?.label}
          {price ? ` · ${price}` : ""}
        </p>
      </div>
    </Link>
  );
}
