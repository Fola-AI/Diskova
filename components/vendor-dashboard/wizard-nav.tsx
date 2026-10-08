import { Check } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { VENDOR_STEPS, type VendorStep } from "@/lib/validation/vendor";

export const STEP_LABELS: Record<VendorStep, string> = {
  basics: "Basics",
  contact: "Contact",
  photos: "Photos",
  details: "Hours & details",
  prices: "Prices",
  review: "Review",
};

export function WizardNav({
  basePath,
  current,
  enabled,
  steps = VENDOR_STEPS,
}: {
  basePath: string;
  current: VendorStep;
  enabled: boolean;
  steps?: readonly VendorStep[];
}) {
  const index = steps.indexOf(current);
  return (
    <nav aria-label="Listing progress" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Step {index + 1} of {steps.length}
        </p>
        <p className="text-sm font-semibold">{STEP_LABELS[current]}</p>
      </div>
      <div className="flex gap-1" aria-hidden>
        {steps.map((step, i) => (
          <span key={step} className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <span className={cn("block h-full origin-left rounded-full bg-positive transition-transform duration-300 ease-out", i <= index ? "scale-x-100" : "scale-x-0")} />
          </span>
        ))}
      </div>
      <ol className="rail fade-x -mx-4 gap-1.5 px-4 py-0.5" aria-label="Steps">
        {steps.map((step, i) => {
          const done = i < index;
          const active = step === current;
          const content = (
            <span
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-footnote font-medium",
                active && "border-transparent bg-primary text-primary-foreground",
                done && "border-positive/40 text-foreground/90",
                !enabled && !active && "opacity-50",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5 text-positive" aria-hidden /> : <span aria-hidden className="tabular-nums">{i + 1}</span>}
              {STEP_LABELS[step]}
              {done ? <span className="sr-only"> (done)</span> : null}
            </span>
          );
          return (
            <li key={step} aria-current={active ? "step" : undefined}>
              {enabled && !active ? <Link href={`${basePath}?step=${step}`} className="pressable hit block rounded-full">{content}</Link> : content}
            </li>
          );
        })}
        <li aria-hidden className="w-2 shrink-0" />
      </ol>
    </nav>
  );
}

export function nextStep(current: VendorStep, steps: readonly VendorStep[] = VENDOR_STEPS): VendorStep | null {
  const i = steps.indexOf(current);
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null;
}

export function prevStep(current: VendorStep, steps: readonly VendorStep[] = VENDOR_STEPS): VendorStep | null {
  const i = steps.indexOf(current);
  return i > 0 ? steps[i - 1] : null;
}
