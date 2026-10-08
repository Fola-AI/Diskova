import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "pressable hit inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14),0_1px_2px_0_hsl(0_0%_0%/0.35)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.12)] hover:bg-destructive/90",
        outline: "border border-input bg-transparent hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04)] hover:bg-secondary/70",
        ghost: "text-foreground/90 hover:bg-secondary hover:text-foreground",
        link: "text-positive underline-offset-4 hover:underline",
        gold: "bg-accent text-accent-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.25)] hover:bg-accent/90",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-10 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner, keeps the width and marks the button busy. Ignored with `asChild`. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    if (asChild) {
      return <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>{children}</Slot>;
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
