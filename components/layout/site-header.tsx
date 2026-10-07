import Link from "next/link";

import { BRAND_NAME } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label={`${BRAND_NAME} home`}>
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground"
          >
            {BRAND_NAME.charAt(0)}
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1">
            <span className="h-2 w-2 animate-live-pulse rounded-full bg-primary" aria-hidden />
            Live
          </span>
        </nav>
      </div>
    </header>
  );
}
