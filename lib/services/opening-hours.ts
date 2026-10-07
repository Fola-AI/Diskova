import { toZonedTime } from "date-fns-tz";
import { z } from "zod";

import { DEFAULT_TIMEZONE } from "@/lib/config";

/**
 * Opening hours (vendors.opening_hours): {"mon":[["18:00","02:00"]], …}. Days are the venue's local
 * days (Africa/Lagos). An end time ≤ start means the interval runs past midnight into the next day;
 * ["00:00","00:00"] means open 24 hours.
 */
export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type Interval = [string, string];
export type OpeningHours = Partial<Record<DayKey, Interval[]>>;

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
export const WEEK_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const openingHoursSchema = z.partialRecord(z.enum(DAY_KEYS), z.array(z.tuple([time, time])).max(4));

/** Lenient parse for display: invalid input → empty hours. */
export function parseOpeningHours(value: unknown): OpeningHours {
  const parsed = openingHoursSchema.safeParse(value);
  return parsed.success ? (parsed.data as OpeningHours) : {};
}

export function hasAnyHours(hours: OpeningHours): boolean {
  return DAY_KEYS.some((d) => (hours[d]?.length ?? 0) > 0);
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** End minute on the start day's clock (may exceed 1440 for overnight intervals). */
function endMinutes([start, end]: Interval): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return e <= s ? e + 1440 : e;
}

export interface OpenStatus {
  hasHours: boolean;
  isOpen: boolean;
  /** "HH:MM" local time the current interval ends. */
  closesAt?: string;
  /** Next opening (when closed). dayOffset 0 = later today, 1 = tomorrow, … */
  opensAt?: { day: DayKey; time: string; dayOffset: number };
}

export function openStatus(
  hours: OpeningHours,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): OpenStatus {
  if (!hasAnyHours(hours)) return { hasHours: false, isOpen: false };

  const local = toZonedTime(now, timeZone);
  const dow = local.getDay();
  const minute = local.getHours() * 60 + local.getMinutes();
  const today = DAY_KEYS[dow];
  const yesterday = DAY_KEYS[(dow + 6) % 7];

  // Spill-over from yesterday's overnight intervals.
  for (const iv of hours[yesterday] ?? []) {
    const end = endMinutes(iv);
    if (end > 1440 && minute < end - 1440) return { hasHours: true, isOpen: true, closesAt: iv[1] };
  }
  // Today's intervals.
  for (const iv of hours[today] ?? []) {
    const start = toMinutes(iv[0]);
    if (minute >= start && minute < endMinutes(iv)) return { hasHours: true, isOpen: true, closesAt: iv[1] };
  }

  // Closed: find the next opening within the coming week.
  const laterToday = (hours[today] ?? [])
    .map((iv) => iv[0])
    .filter((start) => toMinutes(start) > minute)
    .sort();
  if (laterToday.length) return { hasHours: true, isOpen: false, opensAt: { day: today, time: laterToday[0], dayOffset: 0 } };
  for (let offset = 1; offset <= 7; offset++) {
    const day = DAY_KEYS[(dow + offset) % 7];
    const starts = (hours[day] ?? []).map((iv) => iv[0]).sort();
    if (starts.length) return { hasHours: true, isOpen: false, opensAt: { day, time: starts[0], dayOffset: offset } };
  }
  return { hasHours: true, isOpen: false };
}

/** "22:00" → "10pm", "07:30" → "7:30am", "00:00" → "midnight", "12:00" → "noon". */
export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (h === 0 && m === 0) return "midnight";
  if (h === 12 && m === 0) return "noon";
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

/** Short human label: "Open · closes 2am", "Closed · opens 10pm", "Closed · opens Thu 10pm". */
export function openStatusLabel(status: OpenStatus): string {
  if (!status.hasHours) return "Hours not listed";
  if (status.isOpen) return status.closesAt ? `Open · closes ${formatTime(status.closesAt)}` : "Open now";
  if (!status.opensAt) return "Closed";
  const { day, time, dayOffset } = status.opensAt;
  const when = dayOffset === 0 ? "" : dayOffset === 1 ? "tomorrow " : `${DAY_LABELS[day].slice(0, 3)} `;
  return `Closed · opens ${when}${formatTime(time)}`;
}

export function formatIntervals(intervals: Interval[] | undefined): string {
  if (!intervals?.length) return "Closed";
  return intervals
    .map(([s, e]) => (s === e ? "Open 24 hours" : `${formatTime(s)} – ${formatTime(e)}`))
    .join(", ");
}
