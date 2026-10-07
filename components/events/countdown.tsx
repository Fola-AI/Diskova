"use client";

import { useEffect, useState } from "react";

/** Countdown to the season start (§8.6). Renders a static fallback on the server. */
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
  return (
    <div aria-label={label} data-testid="countdown">
      <p className="mb-2 text-sm text-muted-foreground">{label}</p>
      <div className="flex gap-2" aria-live="off">
        {units.map(([u, v]) => (
          <div key={u} className="w-16 rounded-lg border bg-card py-2 text-center">
            <div className="font-display text-2xl font-semibold tabular-nums">{now === null ? "–" : v}</div>
            <div className="text-[10px] uppercase text-muted-foreground">{u}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
