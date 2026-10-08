import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // 16px text on mobile prevents iOS zoom-on-focus
        "flex h-11 w-full rounded-xl border border-input bg-secondary/40 px-3.5 py-2 text-base transition-[border-color,box-shadow,background-color] duration-micro ease-out placeholder:text-muted-foreground/80 hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/25 md:text-sm",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
