import { BRAND_NAME, COMMUNITY_DISCLAIMER } from "@/lib/config";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border/60">
      <div className="container space-y-3 py-8 text-xs leading-relaxed text-muted-foreground">
        <p>{COMMUNITY_DISCLAIMER}</p>
        <p>
          © {year} {BRAND_NAME}. Listing is free. We do not take bookings or payments.
        </p>
      </div>
    </footer>
  );
}
