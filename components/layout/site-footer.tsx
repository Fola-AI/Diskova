import Link from "next/link";

import { BRAND_NAME, COMMUNITY_DISCLAIMER } from "@/lib/config";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const [lead] = COMMUNITY_DISCLAIMER.split(" See Community Guidelines.");
  return (
    <footer className="mt-16 border-t border-border/60">
      <div className="container space-y-3 py-8 text-xs leading-relaxed text-muted-foreground">
        <p>
          {lead} See{" "}
          <Link href="/guidelines" className="underline underline-offset-4 hover:text-foreground">Community Guidelines</Link>.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/guidelines" className="hover:text-foreground">Guidelines</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/vendor" className="hover:text-foreground">For venues</Link>
        </nav>
        <p>
          © {year} {BRAND_NAME}. Listing is free. We do not take bookings or payments.
        </p>
      </div>
    </footer>
  );
}
