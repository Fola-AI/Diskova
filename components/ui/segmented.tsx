"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: React.ReactNode; ariaLabel?: string; testId?: string };

/**
 * iOS-style segmented control. A single pill slides between options (transform + width, 200ms spring).
 * `role` "radiogroup" for a setting (currency), "tablist" for switching panels (days, sections).
 * Roving tabindex with ←/→/Home/End per the WAI-ARIA APG.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  role = "radiogroup",
  className,
  size = "md",
  idPrefix,
  ...props
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  role?: "radiogroup" | "tablist";
  className?: string;
  size?: "sm" | "md";
  /** With role="tablist": tabs get ids `${idPrefix}-tab-${value}` and control `${idPrefix}-panel`. */
  idPrefix?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "role">) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [pill, setPill] = React.useState<{ x: number; w: number } | null>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  React.useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[index];
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && trackRef.current) ro.observe(trackRef.current);
    return () => ro?.disconnect();
  }, [index, options.length]);

  const move = (to: number) => {
    const next = (to + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); move(index + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); move(index - 1); }
    else if (e.key === "Home") { e.preventDefault(); move(0); }
    else if (e.key === "End") { e.preventDefault(); move(options.length - 1); }
  };

  const itemRole = role === "tablist" ? "tab" : "radio";

  return (
    <div
      ref={trackRef}
      role={role}
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("relative inline-flex rounded-xl border bg-secondary/50 p-1", className)}
      {...props}
    >
      {pill ? (
        <span
          aria-hidden
          className="absolute bottom-1 left-0 top-1 rounded-lg bg-primary shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14),0_1px_3px_0_hsl(0_0%_0%/0.4)] transition-[transform,width] duration-200 ease-spring"
          style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
        />
      ) : null}
      {options.map((o, i) => {
        const selected = i === index;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role={itemRole}
            id={idPrefix && role === "tablist" ? `${idPrefix}-tab-${o.value}` : undefined}
            aria-controls={idPrefix && role === "tablist" ? `${idPrefix}-panel` : undefined}
            aria-checked={itemRole === "radio" ? selected : undefined}
            aria-selected={itemRole === "tab" ? selected : undefined}
            aria-label={o.ariaLabel}
            tabIndex={selected ? 0 : -1}
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-micro",
              size === "sm" ? "h-9 px-3 text-[13px]" : "h-10 px-4 text-sm",
              selected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              !pill && selected && "bg-primary",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
