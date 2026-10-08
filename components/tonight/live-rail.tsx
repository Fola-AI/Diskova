"use client";

import { Radio } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { LiveCard } from "@/components/tonight/live-card";
import type { LiveVenue } from "@/lib/db/live";
import { hasAuthCookie } from "@/lib/client/auth-cookie";

const POLL_MS = 30_000; // §8.1: anonymous visitors poll /api/live/[city] every 30 s

/**
 * "Live now" rail. Signed-in visitors subscribe to crowd_snapshots via Realtime; anonymous visitors
 * poll the cached JSON endpoint. Order comes from the server (confidence desc, crowd desc).
 */
export function LiveRail({
  citySlug,
  initial,
  areaNames,
  emptyState,
}: {
  citySlug: string;
  initial: LiveVenue[];
  areaNames: Record<string, string>;
  emptyState: React.ReactNode;
}) {
  const [live, setLive] = useState<LiveVenue[]>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(
    async (fresh: boolean) => {
      try {
        const res = await fetch(`/api/live/${citySlug}${fresh ? `?t=${Date.now()}` : ""}`, { cache: fresh ? "no-store" : "default" });
        if (res.ok) setLive(((await res.json()) as { live: LiveVenue[] }).live);
      } catch {
        // offline: keep showing what we have
      }
    },
    [citySlug],
  );

  useEffect(() => {
    if (!hasAuthCookie()) {
      const id = setInterval(() => document.visibilityState === "visible" && void refetch(false), POLL_MS);
      return () => clearInterval(id);
    }
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { getBrowserSupabase } = await import("@/lib/db/client");
      if (cancelled) return;
      const supabase = getBrowserSupabase();
      const channel = supabase
        .channel(`city-live:${citySlug}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "crowd_snapshots" }, () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void refetch(true), 1500); // one refetch per 5-minute snapshot run
        })
        .subscribe();
      cleanup = () => void supabase.removeChannel(channel);
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [citySlug, refetch]);

  return (
    <section aria-labelledby="live-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="live-heading" className="flex items-center gap-2.5 text-title font-semibold">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-live-ring rounded-full bg-positive" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-positive" />
          </span>
          Live now
        </h2>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-caption font-semibold tabular-nums text-muted-foreground" data-testid="live-count" aria-live="polite">
          {live.length} {live.length === 1 ? "place" : "places"}
        </span>
      </div>
      {live.length > 1 ? (
        <ul className="rail fade-x -mx-4 gap-3 px-4 pb-1" data-testid="live-rail">
          {live.map((v, i) => (
            <li key={v.vendor_id} className="enter-up" style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}>
              <LiveCard venue={v} areaName={v.area_id ? areaNames[v.area_id] : null} priority={i === 0} />
            </li>
          ))}
          <li aria-hidden className="w-1 shrink-0" />
        </ul>
      ) : live.length === 1 ? (
        <ul data-testid="live-rail">
          <li className="enter-up">
            <LiveCard venue={live[0]!} areaName={live[0]!.area_id ? areaNames[live[0]!.area_id] : null} priority wide />
          </li>
        </ul>
      ) : (
        <div className="surface rounded-2xl p-5" data-testid="live-empty">{emptyState}</div>
      )}
      {live.length ? (
        <p className="flex items-start gap-1.5 text-footnote text-muted-foreground">
          <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            From official updates, check-ins and one-tap pulses in the last 90 minutes.{" "}
            <Link href="/vendor" prefetch={false} className="font-medium text-foreground/90 underline underline-offset-4">Own a venue?</Link>
          </span>
        </p>
      ) : null}
    </section>
  );
}
