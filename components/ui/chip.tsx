import { Check } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Filter / choice chip. Selected state = filled + check icon, never colour alone. 40px tall + hit expander. */
export function chipClass(selected: boolean, className?: string) {
  return cn(
    "pressable hit inline-flex h-10 shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium",
    selected
      ? "border-transparent bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14)]"
      : "border-border bg-secondary/40 text-foreground/90 hover:border-muted-foreground/40 hover:bg-secondary",
    className,
  );
}

export function ChipLink({
  selected = false,
  className,
  children,
  showCheck = false,
  ...props
}: React.ComponentProps<typeof Link> & { selected?: boolean; showCheck?: boolean }) {
  return (
    <Link className={chipClass(selected, className)} aria-current={selected ? "true" : undefined} {...props}>
      {selected && showCheck ? <Check className="-ml-1 h-3.5 w-3.5" aria-hidden /> : null}
      {children}
    </Link>
  );
}

export const ChipButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; showCheck?: boolean }
>(({ selected = false, className, children, showCheck = false, ...props }, ref) => (
  <button ref={ref} type="button" className={chipClass(selected, className)} {...props}>
    {selected && showCheck ? <Check className="-ml-1 h-3.5 w-3.5" aria-hidden /> : null}
    {children}
  </button>
));
ChipButton.displayName = "ChipButton";
