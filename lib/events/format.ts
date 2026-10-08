import { formatNaira } from "@/lib/directory/constants";
import { DEFAULT_TIMEZONE } from "@/lib/config";

export function eventDateParts(iso: string, timeZone = DEFAULT_TIMEZONE) {
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NG", { ...o, timeZone }).format(d);
  return {
    day: f({ day: "numeric" }),
    month: f({ month: "short" }),
    weekday: f({ weekday: "short" }),
    time: f({ hour: "numeric", minute: "2-digit" }).replace(":00", "").replace(" ", "").toLowerCase(),
    long: f({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    /** YYYY-MM-DD in the event's zone (grouping key). */
    key: new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d),
  };
}

export function eventPrice(e: { is_free: boolean; price_from_ngn: number | null; price_to_ngn: number | null }): string | null {
  if (e.is_free) return "Free";
  if (e.price_from_ngn !== null && e.price_to_ngn !== null && e.price_to_ngn > e.price_from_ngn) {
    return `${formatNaira(e.price_from_ngn)} – ${formatNaira(e.price_to_ngn)}`;
  }
  if (e.price_from_ngn !== null) return `From ${formatNaira(e.price_from_ngn)}`;
  return null;
}

/** Today's date (YYYY-MM-DD) in Lagos. */
export function lagosToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIMEZONE }).format(now);
}
