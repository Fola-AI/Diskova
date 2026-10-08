"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
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

  const doneLabel = done ? CROWD_LEVELS.find((c) => c.level === done)?.label : null;

  return (
    <div ref={ref} className={cn("surface rounded-3xl p-4 transition-shadow duration-300", highlight && "ring-2 ring-accent")} data-testid="pulse-bar">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-callout font-semibold">How busy is it right now?</p>
        <span className="shrink-0 text-footnote text-muted-foreground">One tap</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {CROWD_LEVELS.map((c) => {
          const on = done === c.level;
          return (
            <button
              key={c.level}
              type="button"
              onClick={() => pulse(c.level)}
              disabled={busy !== null}
              aria-label={`Pulse: ${c.label}`}
              aria-pressed={on}
              className={cn(
                "pressable flex min-h-[68px] flex-col items-center justify-center gap-2 rounded-2xl border px-1 py-2 text-caption font-semibold leading-tight hover:border-muted-foreground/40 disabled:opacity-60",
                on ? "border-positive bg-primary/15" : "bg-secondary/40",
              )}
            >
              {busy === c.level ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <span className={cn("h-4 w-4 rounded-full ring-[3px] ring-white/10 transition-transform duration-200 ease-spring", c.className, on && "scale-125")} aria-hidden />
              )}
              <span aria-hidden>{c.level === 5 ? "Full" : c.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 min-h-5 text-footnote text-muted-foreground" aria-live="polite">
        {doneLabel ? (
          <span className="enter-up inline-flex items-center gap-1.5 text-foreground/90">
            <CheckCircle2 className="h-4 w-4 text-positive" aria-hidden /> Marked {doneLabel.toLowerCase()}. Add photos or details with Check in.
          </span>
        ) : (
          "Updates the live crowd level for everyone."
        )}
      </p>
    </div>
  );
}
