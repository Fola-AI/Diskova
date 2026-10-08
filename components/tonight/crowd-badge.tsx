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
    <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-caption font-semibold text-white ring-1 ring-white/10 backdrop-blur-md", className)}>
      <span className={cn("h-2 w-2 rounded-full ring-2 ring-white/20", crowdClass(level))} aria-hidden />
      {crowdLabel(level)}
      {confidence === "low" ? <span className="font-normal opacity-80">· early signal</span> : null}
    </span>
  );
}
