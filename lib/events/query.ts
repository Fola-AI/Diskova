import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";

import { DEFAULT_TIMEZONE } from "@/lib/config";
import { lagosToday } from "@/lib/events/format";
import { EVENT_CATEGORIES } from "@/lib/validation/events";

export const eventFiltersSchema = z.object({
  city: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().catch(undefined),
  view: z.enum(["list", "month"]).optional().catch(undefined),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().catch(undefined),
  category: z.enum(EVENT_CATEGORIES.map((c) => c.value) as [string, ...string[]]).optional().catch(undefined),
});
export type EventFilters = z.infer<typeof eventFiltersSchema>;

export function parseEventFilters(params: Record<string, string | string[] | undefined>): EventFilters {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(params)) flat[k] = Array.isArray(v) ? v[0] : v;
  return eventFiltersSchema.parse(flat);
}

/** Start of a Lagos-local day / month as a UTC Date. */
export function lagosStartOf(dateYmd: string): Date {
  return fromZonedTime(`${dateYmd}T00:00:00`, DEFAULT_TIMEZONE);
}

export function monthRange(month: string): { from: Date; to: Date } {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: lagosStartOf(`${month}-01`), to: lagosStartOf(`${next}-01`) };
}

export function currentMonth(): string {
  return lagosToday().slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function toQuery(filters: EventFilters, override: Partial<EventFilters> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...filters, ...override })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
