import Link from "next/link";

import { Search } from "lucide-react";

import { AuthNav } from "@/components/layout/auth-nav";

import { BRAND_NAME, FEATURES } from "@/lib/config";

const navLink =
  "pressable inline-flex h-11 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground";

/**
 * Phones: logo + search (primary destinations live in the bottom tab bar).
 * ≥ sm: logo + primary links + search + account. Every target is ≥ 44px.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/" className="pressable -ml-1.5 flex h-11 items-center gap-2 rounded-xl px-1.5" aria-label={`${BRAND_NAME} home`}>
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[hsl(146_75%_34%)] to-primary font-display text-lg font-bold text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.2)]"
          >
            {BRAND_NAME.charAt(0)}
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
        </Link>
        <div className="flex items-center gap-1">
          <span className="mr-1 hidden items-center gap-1.5 rounded-full border border-border px-3 py-1 text-caption font-medium text-muted-foreground md:inline-flex">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-live-ring rounded-full bg-positive" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
            </span>
            Live
          </span>
          <nav aria-label="Primary" className="hidden items-center gap-0.5 sm:flex">
            <Link href="/events" className={navLink}>Events</Link>
            <Link href="/guides" className={navLink}>Guides</Link>
            {FEATURES.aiAssistant ? <Link href="/assistant" prefetch={false} className={navLink}>Ask</Link> : null}
          </nav>
          <Link href="/search" aria-label="Search" className="pressable grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          <div className="hidden sm:block">
            <AuthNav />
          </div>
        </div>
      </div>
    </header>
  );
}
