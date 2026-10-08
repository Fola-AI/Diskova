import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type Crumb = { href?: string; label: string };

/** `City / Venue` style trail. The last crumb is the current page (not a link). */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("-ml-1 text-footnote text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center">
              {c.href && !last ? (
                <Link href={c.href} className="inline-flex h-9 items-center rounded-md px-1 hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="inline-flex h-9 items-center px-1 text-foreground/80">
                  {c.label}
                </span>
              )}
              {!last ? <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
