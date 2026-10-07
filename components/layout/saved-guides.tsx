"use client";

import { useEffect, useState } from "react";

/** Lists pages the service worker saved for offline reading (cache "guides-v1"). */
export function SavedGuides() {
  const [paths, setPaths] = useState<string[] | null>(null);
  useEffect(() => {
    if (!("caches" in window)) return setPaths([]);
    void caches
      .open("guides-v1")
      .then((c) => c.keys())
      .then((keys) => setPaths(keys.map((k) => new URL(k.url).pathname).reverse()))
      .catch(() => setPaths([]));
  }, []);
  if (paths === null) return null;
  if (!paths.length) return <p className="text-sm text-muted-foreground" data-testid="saved-guides-empty">No saved guides yet — open a guide while you&apos;re online and it will be kept here.</p>;
  const label = (p: string) => decodeURIComponent(p.split("/").filter(Boolean).at(-1) ?? p).replace(/-/g, " ");
  return (
    <ul className="space-y-2" data-testid="saved-guides">
      {paths.map((p) => (
        // Plain links: a full navigation lets the service worker answer from its cache.
        <li key={p}><a href={p} className="capitalize underline underline-offset-4">{label(p)}</a></li>
      ))}
    </ul>
  );
}
