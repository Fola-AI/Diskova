"use client";

import { useEffect, type ReactNode } from "react";

import { trackEvent, type AnalyticsEvent } from "@/lib/analytics";

/** Fire an analytics event when a server-rendered child is clicked (consent-gated, no PII). */
export function TrackClick({ event, props, children }: { event: AnalyticsEvent; props?: Record<string, string | number | boolean | null>; children: ReactNode }) {
  return <span className="contents" onClickCapture={() => trackEvent(event, props)}>{children}</span>;
}

/** Fire an analytics event once when a page is shown. */
export function TrackOnMount({ event, props }: { event: AnalyticsEvent; props?: Record<string, string | number | boolean | null> }) {
  useEffect(() => trackEvent(event, props), [event, props]);
  return null;
}
