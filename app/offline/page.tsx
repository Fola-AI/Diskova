import type { Metadata } from "next";

import { SavedGuides } from "@/components/layout/saved-guides";

export const metadata: Metadata = { title: "You're offline", robots: { index: false, follow: false } };
export const dynamic = "force-static";

/** Served by the service worker when there's no connection and the page isn't saved. */
export default function OfflinePage() {
  return (
    <div className="container max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground">
        Live crowd levels need a connection. The guides you read most recently are saved on this device:
      </p>
      <SavedGuides />
      <p className="text-sm text-muted-foreground">If you are in danger, call 112.</p>
    </div>
  );
}
