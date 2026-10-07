import Link from "next/link";

import { Search } from "lucide-react";

import { AuthNav } from "@/components/layout/auth-nav";

import { BRAND_NAME } from "@/lib/config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground"
          >
            {BRAND_NAME.charAt(0)}
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1 sm:inline-flex">
            <span className="h-2 w-2 animate-live-pulse rounded-full bg-primary" aria-hidden />
            Live
          </span>
          <Link href="/search" aria-label="Search" className="grid h-9 w-9 place-items-center rounded-md hover:bg-secondary">
            <Search className="h-4 w-4" aria-hidden />
          </Link>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
