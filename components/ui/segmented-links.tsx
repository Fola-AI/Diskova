import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Segmented control made of links (server-rendered; each option is its own URL). */
export function SegmentedLinks({ label, items, className }: { label: string; items: Array<{ href: string; label: ReactNode; active: boolean }>; className?: string }) {
  return (
    <nav aria-label={label} className={cn("inline-flex rounded-xl border bg-secondary/50 p-1", className)}>
      {items.map((i, idx) => (
        <Link
          key={idx}
          href={i.href}
          scroll={false}
          aria-current={i.active ? "page" : undefined}
          className={cn(
            "pressable inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold",
            i.active ? "bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14),0_1px_3px_0_hsl(0_0%_0%/0.4)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
