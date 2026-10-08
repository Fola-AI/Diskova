"use client";

import { Clock, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "recent-searches";

/** Per-device convenience only; storage can be unavailable (private mode), so every access is guarded. */
export function rememberSearch(q: string) {
  const term = q.trim();
  if (term.length < 2) return;
  try {
    const cur = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
    localStorage.setItem(KEY, JSON.stringify([term, ...cur.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 6)));
  } catch {
    // ignore
  }
}

export function RecentSearches() {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
    } catch {
      setItems([]);
    }
  }, []);
  if (!items.length) return null;
  const clear = () => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setItems([]);
  };
  return (
    <section aria-labelledby="recent-heading" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 id="recent-heading" className="font-sans text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Recent</h2>
        <button type="button" onClick={clear} className="pressable inline-flex h-10 items-center gap-1 rounded-lg px-2 text-footnote text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" aria-hidden /> Clear
        </button>
      </div>
      <ul className="surface divide-y overflow-hidden rounded-2xl">
        {items.map((t) => (
          <li key={t}>
            <Link href={`/search?q=${encodeURIComponent(t)}`} className="flex min-h-12 items-center gap-3 px-4 text-[15px] hover:bg-secondary/60 active:bg-secondary">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden /> {t}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
