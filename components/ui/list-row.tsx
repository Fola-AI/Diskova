import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Grouped list (iOS settings style). Rows are ≥ 56px, icon + label + optional detail + chevron. */
export function ListGroup({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-2", className)}>
      {title ? <h2 className="px-1 font-sans text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">{title}</h2> : null}
      <ul className="surface divide-y overflow-hidden rounded-2xl">{children}</ul>
    </section>
  );
}

export function ListRow({
  href,
  icon: Icon,
  label,
  detail,
  trailing,
  prefetch,
  className,
  testId,
}: {
  href: string;
  icon?: LucideIcon;
  label: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
  prefetch?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch={prefetch}
        data-testid={testId}
        className={cn("pressable-soft flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/60 active:bg-secondary", className)}
      >
        {Icon ? (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-foreground/90">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{label}</span>
          {detail ? <span className="block truncate text-footnote text-muted-foreground">{detail}</span> : null}
        </span>
        {trailing}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
