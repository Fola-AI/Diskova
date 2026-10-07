"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { CONSENT_EVENT, consentCookie, readConsent, type ConsentChoice } from "@/lib/consent";

/** Drop query strings (preview tokens, auth codes, search terms) before anything reaches analytics. */
function stripQuery(event: BeforeSendEvent): BeforeSendEvent | null {
  if (new URL(event.url).pathname.startsWith("/admin")) return null;
  return { ...event, url: event.url.split("?")[0]! };
}

/** Analytics + Speed Insights, mounted only after explicit consent (and only on Vercel). */
export function ConsentGatedAnalytics({ enabled }: { enabled: boolean }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const sync = () => setAllowed(readConsent(document.cookie) === "analytics");
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);
  if (!enabled || !allowed) return null;
  return (
    <>
      <Analytics beforeSend={stripQuery} />
      <SpeedInsights />
    </>
  );
}

export function ConsentBanner() {
  // Server-rendered so it paints with the page; hidden by CSS (`html[data-consent]`) once a choice
  // exists — see CONSENT_BOOT_SCRIPT in the root layout.
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  const choose = (choice: ConsentChoice) => {
    document.cookie = consentCookie(choice, window.location.protocol === "https:");
    document.documentElement.setAttribute("data-consent", choice);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  };

  return (
    <div role="dialog" aria-label="Cookie choices" data-testid="consent-banner"
      className="consent-banner fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="container flex max-w-3xl flex-col gap-3 px-0 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">
          We use essential cookies to keep you signed in. With your OK we also measure page views and speed
          (anonymous, no ads, no cross-site tracking). <Link href="/privacy#cookies" className="underline underline-offset-4">Details</Link>
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => choose("essential")}>Essential only</Button>
          <Button size="sm" onClick={() => choose("analytics")}>Allow analytics</Button>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  return (
    <button type="button" className="hover:text-foreground" onClick={() => document.documentElement.removeAttribute("data-consent")}>
      Cookie settings
    </button>
  );
}
