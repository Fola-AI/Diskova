import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-input bg-secondary/40 px-3.5 py-2.5 text-base leading-relaxed transition-[border-color,box-shadow,background-color] duration-micro ease-out placeholder:text-muted-foreground/80 hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:bg-background focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/25 md:text-sm",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
