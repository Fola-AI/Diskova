import * as React from "react";

import { cn } from "@/lib/utils";

/** Styled native <select> (platform picker kept on phones), 44px tall; the chevron comes from globals.css. */
export const nativeSelectClass =
  "flex h-11 w-full rounded-xl border border-input bg-secondary/40 py-2 pl-3.5 text-base transition-[border-color,box-shadow] duration-micro ease-out hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive md:text-sm";

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(nativeSelectClass, className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
