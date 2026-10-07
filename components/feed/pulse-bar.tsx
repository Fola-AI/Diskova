"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { pulseAction } from "@/app/actions/posts";
import { hasAuthCookie } from "@/lib/client/auth-cookie";
import { getPositionIfGranted } from "@/lib/client/geo";
import { CROWD_LEVELS } from "@/lib/directory/crowd";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

/** §8.3 one-tap pulse: tap a crowd level and it's posted. */
export function PulseBar({ vendorId, vendorSlug }: { vendorId: string; vendorSlug: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState<number | null>(null);
  // Read ?pulse=1 after mount (not useSearchParams): keeps the bar in the static/ISR HTML, so it
  // doesn't pop in after hydration and shift the feed below it (CLS).
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pulse") !== "1") return;
    setHighlight(true);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  async function pulse(level: number) {
    if (!hasAuthCookie()) {
      window.location.href = `/login?next=${encodeURIComponent(`/v/${vendorSlug}?pulse=1`)}`;
      return;
    }
    setBusy(level);
    const pos = await getPositionIfGranted();
    const res = await pulseAction({ vendorId, vendorSlug, crowdLevel: level, lat: pos?.lat ?? null, lng: pos?.lng ?? null });
    setBusy(null);
    if (!res.ok) {
      if (res.needsLogin) window.location.href = `/login?next=${encodeURIComponent(`/v/${vendorSlug}?pulse=1`)}`;
      else toast.error(res.error);
      return;
    }
    setDone(level);
    trackEvent("pulse_submitted", { crowd: level });
    toast.success(res.points ? `Thanks! +${res.points} point${res.points === 1 ? "" : "s"}` : "Thanks for the pulse!");
    window.dispatchEvent(new Event("feed:posted"));
  }

  return (
    <div ref={ref} className={cn("rounded-xl border bg-card p-3", highlight && "ring-2 ring-accent")} data-testid="pulse-bar">
      <p className="mb-2 text-sm font-medium">How busy is it right now? <span className="font-normal text-muted-foreground">One tap.</span></p>
      <div className="grid grid-cols-5 gap-1.5">
        {CROWD_LEVELS.map((c) => (
          <button
            key={c.level}
            type="button"
            onClick={() => pulse(c.level)}
            disabled={busy !== null}
            aria-label={`Pulse: ${c.label}`}
            className={cn(
              "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium leading-tight transition-colors hover:border-primary/60 disabled:opacity-60",
              done === c.level && "border-foreground",
            )}
          >
            {busy === c.level ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <span className={cn("h-3 w-3 rounded-full", c.className)} aria-hidden />}
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
