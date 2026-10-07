"use client";

import { track } from "@vercel/analytics";

import { readConsent } from "@/lib/consent";

/**
 * Custom analytics events (L14). Only sent with analytics consent; never carries personal data
 * (no ids, emails, free text or coordinates) — just the event name and coarse properties.
 */
export type AnalyticsEvent =
  | "pulse_submitted"
  | "checkin_submitted"
  | "official_update_posted"
  | "share_clicked"
  | "map_opened"
  | "calendar_added"
  | "vendor_submitted"
  | "signup_completed"
  | "report_submitted"
  | "search_performed"
  | "list_created"
  | "list_item_added"
  | "list_shared";

type Props = Record<string, string | number | boolean | null>;

export function trackEvent(name: AnalyticsEvent, props?: Props): void {
  try {
    if (typeof document === "undefined" || readConsent(document.cookie) !== "analytics") return;
    track(name, props);
  } catch {
    // analytics must never break the UI
  }
}
