import { toZonedTime } from "date-fns-tz";

import { DAY_KEYS, DAY_LABELS, WEEK_ORDER, formatIntervals, type OpeningHours } from "@/lib/services/opening-hours";
import { cn } from "@/lib/utils";

export function HoursTable({ hours, timeZone }: { hours: OpeningHours; timeZone: string }) {
  const today = DAY_KEYS[toZonedTime(new Date(), timeZone).getDay()];
  return (
    <table className="w-full text-sm">
      <tbody>
        {WEEK_ORDER.map((d) => (
          <tr key={d} className={cn("border-b last:border-0", d === today && "font-semibold text-foreground")}>
            <th scope="row" className="py-2 pr-4 text-left font-normal">
              {DAY_LABELS[d]}
              {d === today ? <span className="sr-only"> (today)</span> : null}
            </th>
            <td className={cn("py-2 text-right", !hours[d]?.length && "text-muted-foreground")}>
              {formatIntervals(hours[d])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
