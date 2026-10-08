"use client";

import { ChevronRight, Clock, MapPin, Ticket } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MarkdownLite } from "@/components/itineraries/markdown-lite";
import { SegmentedControl } from "@/components/ui/segmented";
import { availableCurrencies, computeTotals, formatMoney, type Currency, type Fx } from "@/lib/itineraries/totals";
import { cn } from "@/lib/utils";

export interface ViewItem { id: string; day: number; time_label: string | null; title: string; description_md: string | null; cost_ngn: number | null; cost_note: string | null; vendor: { slug: string; name: string } | null; event: { slug: string; title: string } | null }

const LABEL: Record<Currency, string> = { NGN: "₦ Naira", GBP: "£ Pounds", USD: "$ Dollars" };

/** Amount that rolls in when its value changes (currency or day switch). */
function Money({ value, testId, className }: { value: string; testId?: string; className?: string }) {
  return (
    <span className={cn("inline-block overflow-hidden align-bottom", className)}>
      <span key={value} className="inline-block animate-digit-in tabular-nums" data-testid={testId}>{value}</span>
    </span>
  );
}

/**
 * Day tabs + running per-person total with a ₦/£/$ toggle (rates from Admin → Settings).
 * Day panels slide in from the side they come from; on phones the panel can be swiped between days
 * (1:1 tracking, axis-locked, commits past 25% width or on a flick, rubber-bands at the ends).
 */
export function ItineraryView({ days, items, fx }: { days: number; items: ViewItem[]; fx: Fx }) {
  const currencies = availableCurrencies(fx);
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [day, setDay] = useState(1);
  const [dir, setDir] = useState<"left" | "right" | null>(null);
  const panelRef = useRef<HTMLOListElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
  const goTo = (d: number, focus = false) => {
    const next = Math.min(days, Math.max(1, d));
    if (next === day) return;
    setDir(next > day ? "right" : "left");
    setDay(next);
    tabRefs.current[next - 1]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    if (focus) tabRefs.current[next - 1]?.focus();
  };

  // Swipe between days (touch only; vertical scrolling stays native).
  useEffect(() => {
    const el = panelRef.current;
    if (!el || days < 2) return;
    let startX = 0, startY = 0, dx = 0, lastX = 0, lastT = 0, v = 0;
    let axis: "x" | "y" | null = null;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]!;
      startX = lastX = t.clientX; startY = t.clientY; lastT = e.timeStamp; dx = 0; v = 0; axis = null;
      el.style.transition = "none";
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0]!;
      const mx = t.clientX - startX, my = t.clientY - startY;
      if (!axis && Math.hypot(mx, my) > 10) axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (axis !== "x") return;
      e.preventDefault();
      const atEdge = (mx > 0 && day === 1) || (mx < 0 && day === days);
      dx = atEdge ? mx * 0.3 : mx;
      v = (t.clientX - lastX) / Math.max(1, e.timeStamp - lastT);
      lastX = t.clientX; lastT = e.timeStamp;
      el.style.transform = `translate3d(${dx}px,0,0)`;
    };
    const onEnd = () => {
      if (axis !== "x") { el.style.transition = ""; el.style.transform = ""; return; }
      const w = el.offsetWidth;
      const commit = Math.abs(dx) > w * 0.25 || Math.abs(v) > 0.4;
      const target = dx < 0 ? day + 1 : day - 1;
      el.style.transition = "transform 260ms var(--ease-spring)";
      el.style.transform = "translate3d(0,0,0)";
      const clear = () => { el.style.transition = ""; el.style.transform = ""; el.removeEventListener("transitionend", clear); };
      el.addEventListener("transitionend", clear);
      if (commit && target >= 1 && target <= days) { clear(); goTo(target); }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, days]);

  const totals = computeTotals(items, days);
  const today = totals.days[day - 1]!;
  const money = (ngn: number) => formatMoney(ngn, currency, fx);

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(day + 1, true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(day - 1, true); }
    else if (e.key === "Home") { e.preventDefault(); goTo(1, true); }
    else if (e.key === "End") { e.preventDefault(); goTo(days, true); }
  };

  return (
    <div className="space-y-5" data-testid="itinerary-view">
      {currencies.length > 1 ? (
        <SegmentedControl
          label="Currency"
          data-testid="currency-toggle"
          className="w-full sm:w-auto"
          value={currency}
          onChange={choose}
          options={currencies.map((c) => ({ value: c, label: LABEL[c] }))}
        />
      ) : null}

      {days > 1 ? (
        <div role="tablist" aria-label="Days" onKeyDown={onTabKey} className="rail fade-x -mx-4 gap-2 px-4 py-1">
          {totals.days.map((d) => {
            const on = day === d.day;
            return (
              <button
                key={d.day}
                ref={(el) => { tabRefs.current[d.day - 1] = el; }}
                type="button"
                role="tab"
                id={`day-tab-${d.day}`}
                aria-selected={on}
                aria-controls="day-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => goTo(d.day)}
                data-testid={`day-tab-${d.day}`}
                className={cn(
                  "pressable hit inline-flex h-11 shrink-0 items-center rounded-full border px-5 text-sm font-semibold",
                  on ? "border-transparent bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14)]" : "bg-secondary/40 text-foreground/85 hover:bg-secondary",
                )}
              >
                Day {d.day}
              </button>
            );
          })}
          <span className="w-2 shrink-0" aria-hidden />
        </div>
      ) : null}

      <ol
        ref={panelRef}
        key={day}
        id="day-panel"
        role="tabpanel"
        aria-labelledby={days > 1 ? `day-tab-${day}` : undefined}
        aria-label={days > 1 ? undefined : `Day ${day}`}
        className={cn("relative space-y-3", dir === "right" && "slide-from-right", dir === "left" && "slide-from-left")}
      >
        {items.filter((i) => i.day === day).map((it, idx, arr) => (
          <li key={it.id} className="relative pl-6" data-testid="itinerary-stop">
            {/* Timeline rail */}
            <span aria-hidden className="absolute left-[7px] top-5 h-3 w-3 rounded-full border-2 border-positive bg-background" />
            {idx < arr.length - 1 ? <span aria-hidden className="absolute bottom-[-0.75rem] left-[12px] top-9 w-px bg-border" /> : null}
            <div className="surface rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  {it.time_label ? <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground"><Clock className="h-3.5 w-3.5" aria-hidden /> {it.time_label}</p> : null}
                  <h3 className="text-callout font-semibold">{it.title}</h3>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold" data-testid="stop-cost">{it.cost_ngn === null ? "—" : <Money value={money(it.cost_ngn)} />}</p>
                  {it.cost_note ? <p className="text-footnote text-muted-foreground">{it.cost_note}</p> : null}
                </div>
              </div>
              {it.description_md ? <div className="mt-2 text-[15px] leading-relaxed text-muted-foreground"><MarkdownLite text={it.description_md} /></div> : null}
              {it.vendor || it.event ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {it.vendor ? (
                    <Link href={`/v/${it.vendor.slug}`} className="pressable inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-footnote font-semibold hover:bg-secondary/70">
                      <MapPin className="h-4 w-4 text-positive" aria-hidden /> {it.vendor.name} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    </Link>
                  ) : null}
                  {it.event ? (
                    <Link href={`/events/${it.event.slug}`} className="pressable inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-footnote font-semibold hover:bg-secondary/70">
                      <Ticket className="h-4 w-4 text-accent" aria-hidden /> {it.event.title} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <section
        aria-label="Totals"
        className="sticky bottom-[calc(var(--tabbar-h)+0.5rem)] z-20 rounded-2xl border bg-background/85 px-4 py-3 shadow-[0_12px_32px_-8px_hsl(0_0%_0%/0.7)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70"
        data-testid="itinerary-totals"
      >
        <dl className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <dt className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Day {day}</dt>
            <dd className="text-callout font-semibold"><Money value={money(today.subtotal)} testId="day-subtotal" /></dd>
          </div>
          {day > 1 ? (
            <div className="min-w-0">
              <dt className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">So far</dt>
              <dd className="text-callout font-semibold"><Money value={money(today.runningTotal)} testId="running-total" /></dd>
            </div>
          ) : null}
          {days > 1 ? (
            <div className="min-w-0 text-right">
              <dt className="text-caption font-semibold uppercase tracking-[0.06em] text-positive">Whole trip</dt>
              <dd className="text-title font-semibold"><Money value={money(totals.total)} testId="trip-total" /></dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-1 text-caption text-muted-foreground">
          Per person, rough guide{totals.unpriced ? ` · ${totals.unpriced} stop${totals.unpriced === 1 ? "" : "s"} without a cost` : ""}
          {currency !== "NGN" ? " · ≈ converted at our rate; your bank's will differ" : ""}.
        </p>
        <p className="sr-only" aria-live="polite">{currency === "NGN" ? "" : `Totals now in ${LABEL[currency].split(" ")[1]?.toLowerCase()}`}</p>
      </section>
    </div>
  );
}
