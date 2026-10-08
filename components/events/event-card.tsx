import { CalendarHeart, MapPin, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { SEASON_NAME } from "@/lib/config";
import type { EventCardRow } from "@/lib/db/events";
import { eventDateParts, eventPrice } from "@/lib/events/format";
import { EVENT_CATEGORIES } from "@/lib/validation/events";
import { AddToNight } from "@/components/lists/add-to-night";
import { cn } from "@/lib/utils";

export function EventCard({
  event,
  showCity = false,
}: {
  event: EventCardRow;
  showCity?: boolean;
}) {
  const d = eventDateParts(event.starts_at, event.timezone);
  const price = eventPrice(event);
  const cancelled = event.status === "cancelled";
  const category = EVENT_CATEGORIES.find((c) => c.value === event.category)?.label;
  return (
    <div className="relative h-full">
      <Link
        href={`/events/${event.slug}`}
        className="surface pressable-soft flex h-full gap-3.5 rounded-2xl p-3 pr-14 transition-[transform,border-color] duration-micro hover:border-primary/50 active:scale-[0.985] [content-visibility:auto] [contain-intrinsic-size:auto_104px]"
        data-testid="event-card"
      >
        <time
          dateTime={d.key}
          className={cn(
            "flex w-[3.75rem] shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center",
            event.is_december_season ? "bg-accent/10 ring-1 ring-accent/25" : "bg-secondary",
          )}
        >
          <span className="sr-only">{d.long}</span>
          <span aria-hidden className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">{d.month}</span>
          <span aria-hidden className="font-display text-[1.625rem] font-semibold leading-none">{d.day}</span>
          <span aria-hidden className="mt-0.5 text-caption text-muted-foreground">{d.weekday}</span>
        </time>
        <div className="min-w-0 flex-1 space-y-1 py-0.5">
          {event.is_featured || cancelled || event.is_december_season ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {event.is_featured ? (
                <Badge variant="gold">
                  <Star aria-hidden />
                  Featured
                </Badge>
              ) : null}
              {cancelled ? <Badge variant="destructive">Cancelled</Badge> : null}
              {event.is_december_season ? (
                <span className="inline-flex items-center gap-1 text-caption font-medium text-accent">
                  <CalendarHeart className="h-3.5 w-3.5" aria-hidden />
                  {SEASON_NAME}
                </span>
              ) : null}
            </div>
          ) : null}
          <p className={cn("line-clamp-2 font-semibold leading-snug", cancelled && "line-through opacity-70")}>
            {event.title}
          </p>
          <p className="flex items-center gap-1 truncate text-footnote text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {event.venue?.name ?? event.venue_name_freeform}
              {showCity && event.city ? ` · ${event.city.name}` : ""}
            </span>
          </p>
          <p className="text-footnote text-muted-foreground">
            <span className="font-medium text-foreground/85">{d.time}</span>
            {category ? ` · ${category}` : ""}
            {price ? <> · <span className="font-medium text-foreground/85">{price}</span></> : null}
          </p>
        </div>
      </Link>
      {cancelled ? null : (
        <AddToNight
          compact
          target={{ eventId: event.id, name: event.title }}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary text-foreground ring-0 hover:bg-secondary/70"
        />
      )}
    </div>
  );
}
