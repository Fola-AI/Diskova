"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DAY_LABELS, WEEK_ORDER, type DayKey, type Interval, type OpeningHours } from "@/lib/services/opening-hours";

const timeClass =
  "h-11 w-[7.5rem] rounded-xl border border-input bg-secondary/40 px-2.5 text-base tabular-nums transition-[border-color,box-shadow] duration-micro focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 md:text-sm";

/** Per-day intervals. An end time earlier than the start means "past midnight". */
export function HoursEditor({ value, onChange }: { value: OpeningHours; onChange: (v: OpeningHours) => void }) {
  function setDay(day: DayKey, intervals: Interval[]) {
    const next = { ...value };
    if (intervals.length) next[day] = intervals;
    else delete next[day];
    onChange(next);
  }
  function copyToAll(day: DayKey) {
    const src = value[day] ?? [];
    const next: OpeningHours = {};
    for (const d of WEEK_ORDER) if (src.length) next[d] = src.map((iv) => [...iv] as Interval);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {WEEK_ORDER.map((day) => {
        const intervals = value[day] ?? [];
        return (
          <div key={day} className="surface rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{DAY_LABELS[day]}</span>
              <div className="flex gap-1">
                {intervals.length ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => copyToAll(day)}>Copy to all</Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDay(day, [...intervals, intervals.length ? ["18:00", "23:00"] : ["12:00", "22:00"]])}
                  disabled={intervals.length >= 3}
                  aria-label={`Add hours on ${DAY_LABELS[day]}`}
                >
                  <Plus aria-hidden /> {intervals.length ? "" : "Add hours"}
                </Button>
              </div>
            </div>
            {intervals.length === 0 ? <p className="text-footnote text-muted-foreground">Closed</p> : null}
            {intervals.map(([start, end], i) => (
              <div key={i} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <input type="time" className={timeClass} value={start} aria-label={`${DAY_LABELS[day]} opens`}
                  onChange={(e) => setDay(day, intervals.map((iv, j) => (j === i ? [e.target.value, iv[1]] : iv)))} />
                <span aria-hidden>–</span>
                <input type="time" className={timeClass} value={end} aria-label={`${DAY_LABELS[day]} closes`}
                  onChange={(e) => setDay(day, intervals.map((iv, j) => (j === i ? [iv[0], e.target.value] : iv)))} />
                {end <= start && end !== "" ? <span className="text-footnote text-muted-foreground">(next day)</span> : null}
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove these hours"
                  onClick={() => setDay(day, intervals.filter((_, j) => j !== i))}>
                  <X aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
