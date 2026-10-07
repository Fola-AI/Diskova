"use client";

import { Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { MarkdownLite } from "@/components/itineraries/markdown-lite";
import { availableCurrencies, computeTotals, formatMoney, type Currency, type Fx } from "@/lib/itineraries/totals";
import { cn } from "@/lib/utils";

export interface ViewItem { id: string; day: number; time_label: string | null; title: string; description_md: string | null; cost_ngn: number | null; cost_note: string | null; vendor: { slug: string; name: string } | null; event: { slug: string; title: string } | null }

const LABEL: Record<Currency, string> = { NGN: "₦ Naira", GBP: "£ Pounds", USD: "$ Dollars" };

/** Day tabs + running per-person total with a ₦/£/$ toggle (rates from Admin → Settings). */
export function ItineraryView({ days, items, fx }: { days: number; items: ViewItem[]; fx: Fx }) {
  const currencies = availableCurrencies(fx);
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [day, setDay] = useState(1);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("currency") as Currency | null;
      if (saved && currencies.includes(saved)) setCurrency(saved);
    } catch {
      // storage unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = (c: Currency) => {
    setCurrency(c);
    try {
      window.localStorage.setItem("currency", c);
    } catch {
      // storage unavailable
    }
  };
  const totals = computeTotals(items, days);
  const today = totals.days[day - 1]!;
  const money = (ngn: number) => formatMoney(ngn, currency, fx);

  return (
    <div className="space-y-5" data-testid="itinerary-view">
      {currencies.length > 1 ? (
        <div role="radiogroup" aria-label="Currency" className="inline-flex rounded-lg border p-0.5 text-sm" data-testid="currency-toggle">
          {currencies.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={currency === c} onClick={() => choose(c)}
              className={cn("rounded-md px-3 py-1.5", currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {LABEL[c]}
            </button>
          ))}
        </div>
      ) : null}

      {days > 1 ? (
        <div role="tablist" aria-label="Days" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {totals.days.map((d) => (
            <button key={d.day} type="button" role="tab" aria-selected={day === d.day} onClick={() => setDay(d.day)} data-testid={`day-tab-${d.day}`}
              className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm", day === d.day && "border-primary bg-primary text-primary-foreground")}>
              Day {d.day}
            </button>
          ))}
        </div>
      ) : null}

      <ol className="space-y-3" role="tabpanel" aria-label={`Day ${day}`}>
        {items.filter((i) => i.day === day).map((it) => (
          <li key={it.id} className="rounded-xl border bg-card p-4" data-testid="itinerary-stop">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                {it.time_label ? <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground"><Clock className="h-3 w-3" aria-hidden /> {it.time_label}</p> : null}
                <h3 className="font-semibold">{it.title}</h3>
                {it.vendor ? <Link href={`/v/${it.vendor.slug}`} className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"><MapPin className="h-3.5 w-3.5" aria-hidden /> {it.vendor.name}</Link> : null}
                {it.event ? <Link href={`/events/${it.event.slug}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">{it.event.title}</Link> : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold" data-testid="stop-cost">{it.cost_ngn === null ? "—" : money(it.cost_ngn)}</p>
                {it.cost_note ? <p className="text-xs text-muted-foreground">{it.cost_note}</p> : null}
              </div>
            </div>
            {it.description_md ? <div className="mt-2 text-sm text-muted-foreground"><MarkdownLite text={it.description_md} /></div> : null}
          </li>
        ))}
      </ol>

      <section className="sticky bottom-2 z-10 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur" data-testid="itinerary-totals">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span>Day {day}: <strong data-testid="day-subtotal">{money(today.subtotal)}</strong></span>
          <span>Running total to day {day}: <strong data-testid="running-total">{money(today.runningTotal)}</strong></span>
          {days > 1 ? <span className="text-muted-foreground">Whole trip: <strong data-testid="trip-total">{money(totals.total)}</strong></span> : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Per person, rough guide{totals.unpriced ? ` · ${totals.unpriced} stop${totals.unpriced === 1 ? "" : "s"} without a cost` : ""}
          {currency !== "NGN" ? " · converted at the rate in our settings; your bank's rate will differ" : ""}.
        </p>
      </section>
    </div>
  );
}
