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
    <ol className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 text-xs [scrollbar-width:none]" aria-label="Steps">
      {steps.map((step, i) => {
        const done = i < index;
        const active = step === current;
        const content = (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5",
              active && "border-primary bg-primary text-primary-foreground",
              done && "border-primary/40",
              !enabled && !active && "opacity-50",
            )}
          >
            {done ? <Check className="h-3 w-3" aria-hidden /> : <span aria-hidden>{i + 1}</span>}
            {STEP_LABELS[step]}
          </span>
        );
        return (
          <li key={step} aria-current={active ? "step" : undefined}>
            {enabled && !active ? <Link href={`${basePath}?step=${step}`}>{content}</Link> : content}
          </li>
        );
      })}
    </ol>
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
