"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * iOS-style switch built on a native checkbox (forms and labels keep working).
 * 51×31 visual inside a 44px row; the thumb travels with a 200ms spring.
 */
export const Switch = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => (
    <span className={cn("relative inline-flex h-[31px] w-[51px] shrink-0 items-center", className)}>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-muted-foreground/30 transition-colors duration-micro ease-out peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_hsl(0_0%_0%/0.35)] transition-transform duration-200 ease-spring peer-checked:translate-x-5 peer-active:scale-x-110"
      />
    </span>
  ),
);
Switch.displayName = "Switch";
