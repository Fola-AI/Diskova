import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** One empty-state pattern everywhere (docs/ux-audit.md G7): icon, title, one line, one action. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
  compact = false,
  ...props
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "title">) {
  return (
    <div
      className={cn(
        "surface flex flex-col items-center rounded-2xl text-center",
        compact ? "gap-2 px-5 py-6" : "gap-3 px-6 py-10",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <span className={cn("grid place-items-center rounded-2xl bg-secondary text-muted-foreground", compact ? "h-11 w-11" : "h-14 w-14")}>
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
        </span>
      ) : null}
      <p className={cn("font-display font-semibold", compact ? "text-callout" : "text-title")}>{title}</p>
      {children ? <div className="max-w-sm text-sm leading-relaxed text-muted-foreground">{children}</div> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
