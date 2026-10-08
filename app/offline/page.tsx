import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

import { RetryButton } from "@/components/layout/retry-button";
import { SavedGuides } from "@/components/layout/saved-guides";

export const metadata: Metadata = { title: "You're offline", robots: { index: false, follow: false } };
export const dynamic = "force-static";

/** Served by the service worker when there's no connection and the page isn't saved. */
export default function OfflinePage() {
  return (
    <div className="container max-w-2xl space-y-6 px-4 py-10">
      <div className="space-y-3 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
          <WifiOff className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-display font-semibold">You&apos;re offline</h1>
        <p className="text-muted-foreground">Live crowd levels need a connection. The guides you read most recently are saved on this device.</p>
        <RetryButton />
      </div>
      <SavedGuides />
      <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium">If you are in danger, call 112.</p>
    </div>
  );
}
