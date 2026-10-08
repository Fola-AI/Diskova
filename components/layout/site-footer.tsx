import Link from "next/link";

import { CookieSettingsButton } from "@/components/layout/consent";
import { BRAND_NAME, COMMUNITY_DISCLAIMER } from "@/lib/config";

const link = "inline-flex min-h-10 items-center py-1 hover:text-foreground";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const [lead] = COMMUNITY_DISCLAIMER.split(" See Community Guidelines.");
  return (
    <footer className="mt-14 border-t border-border/60 bg-card/30">
      <div className="container space-y-6 py-10 text-footnote leading-relaxed text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
            {BRAND_NAME.charAt(0)}
          </span>
          <span className="font-display text-base font-semibold">{BRAND_NAME}</span>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <span className="mb-1 text-caption font-semibold uppercase tracking-[0.06em] text-foreground/70">Explore</span>
            <Link href="/events" className={link}>Events</Link>
            <Link href="/guides" className={link}>Guides</Link>
            <Link href="/itineraries" className={link}>Itineraries</Link>
            <Link href="/toolkit" className={link}>Diaspora toolkit</Link>
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-caption font-semibold uppercase tracking-[0.06em] text-foreground/70">Stay safe</span>
            <Link href="/safety" className={link}>Safety</Link>
            <Link href="/guidelines" className={link}>Guidelines</Link>
            <Link href="/vendor" prefetch={false} className={link}>For venues</Link>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-x-5 sm:col-span-1 sm:flex-col sm:items-start sm:gap-x-0">
            <span className="mb-1 w-full text-caption font-semibold uppercase tracking-[0.06em] text-foreground/70">Legal</span>
            <Link href="/privacy" className={link}>Privacy</Link>
            <Link href="/terms" className={link}>Terms</Link>
            <CookieSettingsButton className={`${link} text-left text-muted-foreground`} />
          </div>
        </nav>
        <p className="max-w-2xl">
          {lead} See{" "}
          <Link href="/guidelines" className="underline underline-offset-4 hover:text-foreground">Community Guidelines</Link>.
        </p>
        <p>
          © {year} {BRAND_NAME}. Listing is free. We do not take bookings or payments.
        </p>
      </div>
    </footer>
  );
}
