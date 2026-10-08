import { cn } from "@/lib/utils";

/** Accessible progress bar; fills with transform (no layout), 400ms ease-out. */
export function Progress({ value, max = 100, label, valueText, className }: { value: number; max?: number; label: string; valueText?: string; className?: string }) {
  const ratio = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className={cn("h-2 overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-[hsl(146_65%_40%)] transition-transform duration-500 ease-out"
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
