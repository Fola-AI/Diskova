import { toZonedTime } from "date-fns-tz";

import { DAY_KEYS, DAY_LABELS, WEEK_ORDER, formatIntervals, type OpeningHours } from "@/lib/services/opening-hours";
import { cn } from "@/lib/utils";

export function HoursTable({ hours, timeZone }: { hours: OpeningHours; timeZone: string }) {
  const today = DAY_KEYS[toZonedTime(new Date(), timeZone).getDay()];
  return (
    <table className="w-full text-sm">
      <tbody>
        {WEEK_ORDER.map((d) => {
          const isToday = d === today;
          return (
            <tr key={d} aria-current={isToday ? "date" : undefined} className={cn("border-b last:border-0", isToday && "bg-primary/10 font-semibold text-foreground")}>
              <th scope="row" className="py-3 pl-4 pr-4 text-left font-normal">
                <span className="inline-flex items-center gap-2">
                  {DAY_LABELS[d]}
                  {isToday ? <span className="rounded-full bg-primary px-2 py-0.5 text-caption font-semibold text-primary-foreground">Today</span> : null}
                </span>
              </th>
              <td className={cn("py-3 pr-4 text-right tabular-nums", !hours[d]?.length && "text-muted-foreground")}>
                {formatIntervals(hours[d])}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
