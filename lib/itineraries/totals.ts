/**
 * Itinerary money maths (PRD P4). Pure, shared by server and client, unit-tested.
 * Costs are per person in whole naira; items without a cost are counted, never guessed.
 */
export type Currency = "NGN" | "GBP" | "USD";
export interface Fx { gbpPerNgn: number | null; usdPerNgn: number | null }
export interface CostItem { day: number; cost_ngn: number | null }

export interface DayTotal { day: number; subtotal: number; runningTotal: number; priced: number; unpriced: number }
export interface Totals { days: DayTotal[]; total: number; priced: number; unpriced: number }

export function computeTotals(items: CostItem[], days: number): Totals {
  const out: DayTotal[] = [];
  let running = 0;
  let priced = 0;
  let unpriced = 0;
  for (let d = 1; d <= days; d++) {
    const dayItems = items.filter((i) => i.day === d);
    const subtotal = dayItems.reduce((sum, i) => sum + (i.cost_ngn ?? 0), 0);
    const p = dayItems.filter((i) => i.cost_ngn !== null).length;
    running += subtotal;
    priced += p;
    unpriced += dayItems.length - p;
    out.push({ day: d, subtotal, runningTotal: running, priced: p, unpriced: dayItems.length - p });
  }
  return { days: out, total: running, priced, unpriced };
}

/** Currencies the toggle can offer: naira always; £/$ only when an FX rate is set in Admin → Settings. */
export function availableCurrencies(fx: Fx): Currency[] {
  return ["NGN", ...(fx.gbpPerNgn ? (["GBP"] as const) : []), ...(fx.usdPerNgn ? (["USD"] as const) : [])];
}

export function convert(ngn: number, currency: Currency, fx: Fx): number {
  if (currency === "GBP" && fx.gbpPerNgn) return ngn * fx.gbpPerNgn;
  if (currency === "USD" && fx.usdPerNgn) return ngn * fx.usdPerNgn;
  return ngn;
}

/** ₦ to the naira; £/$ to whole units (these are rough guides — never show false precision). */
export function formatMoney(ngn: number, currency: Currency, fx: Fx): string {
  const value = convert(ngn, currency, fx);
  if (currency === "NGN") return ngn === 0 ? "Free" : `₦${Math.round(value).toLocaleString("en-NG")}`;
  const symbol = currency === "GBP" ? "£" : "$";
  if (ngn === 0) return "Free";
  return value < 1 ? `<${symbol}1` : `${symbol}${Math.round(value).toLocaleString("en-GB")}`;
}
