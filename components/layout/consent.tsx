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
      className="consent-banner enter-up fixed inset-x-3 bottom-[calc(var(--tabbar-h)+0.75rem)] z-50 rounded-2xl border bg-card/95 p-4 shadow-[0_12px_40px_-8px_hsl(0_0%_0%/0.6)] backdrop-blur-xl sm:inset-x-auto sm:left-1/2 sm:w-[min(44rem,calc(100%-2rem))] sm:-translate-x-1/2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-footnote text-muted-foreground">
          We use essential cookies to keep you signed in. With your OK we also measure page views and speed
          (anonymous, no ads, no cross-site tracking). <Link href="/privacy#cookies" className="underline underline-offset-4">Details</Link>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="secondary" onClick={() => choose("essential")}>Essential only</Button>
          <Button variant="secondary" onClick={() => choose("analytics")}>Allow analytics</Button>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton({ className = "hover:text-foreground" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => document.documentElement.removeAttribute("data-consent")}>
      Cookie settings
    </button>
  );
}
