"use client";

import { CheckCircle2, Flag } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";

/**
 * The check-in and report sheets (Radix Dialog + upload code) load after the page is interactive, so
 * they don't weigh on first paint of the venue page. Placeholders look identical.
 */
export const LazyCheckinSheet = dynamic(() => import("@/components/feed/checkin-sheet").then((m) => m.CheckinSheet), {
  ssr: false,
  loading: () => (
    <Button type="button" variant="secondary" className="w-full" size="lg" disabled>
      <CheckCircle2 aria-hidden /> Check in
    </Button>
  ),
});

export const LazyReportButton = dynamic(() => import("@/components/feed/report-button").then((m) => m.ReportButton), {
  ssr: false,
  loading: () => (
    <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled>
      <Flag aria-hidden /> Report
    </Button>
  ),
});
