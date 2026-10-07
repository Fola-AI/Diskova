import { Clock } from "lucide-react";

import { openStatus, openStatusLabel, parseOpeningHours } from "@/lib/services/opening-hours";
import { cn } from "@/lib/utils";

export function OpenStatusBadge({
  hours,
  timeZone,
  className,
}: {
  hours: unknown;
  timeZone?: string;
  className?: string;
}) {
  const status = openStatus(parseOpeningHours(hours), new Date(), timeZone);
  if (!status.hasHours) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        status.isOpen ? "text-positive" : "text-muted-foreground",
        className,
      )}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {openStatusLabel(status)}
    </span>
  );
}
