import { DAY_KEYS, type DayKey, type OpeningHours } from "@/lib/services/opening-hours";

/**
 * Human opening-hours syntax for /content CSVs:
 *   "mon-fri 18:00-02:00; sat,sun 12:00-04:00"   ·   "daily 09:00-17:00"   ·   "tue 10:00-14:00, 16:00-22:00"
 * An end time earlier than the start runs past midnight. Days not mentioned are closed.
 */
const ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function expandDays(spec: string): DayKey[] {
  if (spec === "daily") return [...ORDER];
  const out = new Set<DayKey>();
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-") as [string, string | undefined];
    if (!DAY_KEYS.includes(a as DayKey) || (b && !DAY_KEYS.includes(b as DayKey))) throw new Error(`unknown day "${part}" (use mon…sun, ranges like mon-fri, or daily)`);
    if (!b) out.add(a as DayKey);
    else {
      const from = ORDER.indexOf(a as DayKey);
      const to = ORDER.indexOf(b as DayKey);
      for (let i = from; ; i = (i + 1) % 7) {
        out.add(ORDER[i]!);
        if (i === to) break;
      }
    }
  }
  return [...out];
}

export function parseHoursSyntax(text: string): OpeningHours {
  const hours: OpeningHours = {};
  const src = text.trim().toLowerCase();
  if (!src) return hours;
  for (const clause of src.split(";").map((c) => c.trim()).filter(Boolean)) {
    const m = /^([a-z,\-]+)\s+(.+)$/.exec(clause);
    if (!m) throw new Error(`can't read "${clause}" (expected e.g. "mon-fri 18:00-02:00")`);
    const days = expandDays(m[1]!);
    if (m[2]!.trim() === "closed") continue;
    const intervals = m[2]!.split(",").map((iv) => {
      const [open, close] = iv.trim().split("-").map((t) => t.trim()) as [string, string | undefined];
      if (!close || !TIME.test(open) || !TIME.test(close)) throw new Error(`bad time range "${iv.trim()}" (use HH:MM-HH:MM)`);
      return [open, close] as [string, string];
    });
    for (const d of days) hours[d] = [...(hours[d] ?? []), ...intervals].slice(0, 4);
  }
  return hours;
}
