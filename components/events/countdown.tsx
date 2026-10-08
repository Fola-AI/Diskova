"use client";

import { useEffect, useState } from "react";

/**
 * Countdown to the season start (§8.6). Renders a static fallback on the server.
 * Digits roll in when they change (200ms ease-out; instant under reduced motion). Screen readers get
 * one calm sentence instead of a per-second tick.
 */
export function Countdown({ target, label }: { target: string; label: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date(target).getTime();
  const diff = Math.max(0, end - (now ?? end));
  const units = [
    ["days", Math.floor(diff / 86_400_000)],
    ["hours", Math.floor((diff / 3_600_000) % 24)],
    ["mins", Math.floor((diff / 60_000) % 60)],
    ["secs", Math.floor((diff / 1000) % 60)],
  ] as const;
  const days = units[0][1];
  return (
    <div data-testid="countdown">
      <p className="mb-2.5 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="sr-only">{now === null ? "" : `${label} ${days} ${days === 1 ? "day" : "days"}.`}</p>
      <div className="grid max-w-sm grid-cols-4 gap-2" aria-hidden>
        {units.map(([u, v]) => (
          <div key={u} className="surface overflow-hidden rounded-2xl py-3 text-center">
            <div className="relative h-9 overflow-hidden font-display text-[2rem] font-semibold leading-9 tabular-nums">
              <span key={now === null ? "x" : v} className="block animate-digit-in">{now === null ? "–" : String(v).padStart(u === "days" ? 1 : 2, "0")}</span>
            </div>
            <div className="mt-1 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">{u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
