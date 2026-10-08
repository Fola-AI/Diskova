import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** "‹ Dashboard" — a 40px back target that sits above a page title. */
export function BackLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("pressable -ml-2 inline-flex h-10 items-center gap-0.5 rounded-xl pl-1 pr-2.5 text-footnote font-medium text-muted-foreground hover:text-foreground", className)}>
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  );
}
