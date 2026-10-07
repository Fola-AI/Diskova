import { crowdClass, crowdLabel } from "@/lib/directory/crowd";
import { cn } from "@/lib/utils";

/** Crowd level pill (rounded average). Confidence "low" is shown as "early signal". */
export function CrowdBadge({
  level,
  confidence,
  className,
}: {
  level: number | null | undefined;
  confidence?: "low" | "medium" | "high" | null;
  className?: string;
}) {
  if (!level) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", crowdClass(level))} aria-hidden />
      {crowdLabel(level)}
      {confidence === "low" ? <span className="font-normal opacity-75">· early signal</span> : null}
    </span>
  );
}
