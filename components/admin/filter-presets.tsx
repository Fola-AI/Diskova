"use client";

import { Bookmark, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Preset { name: string; query: string }

function load(key: string): Preset[] {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Preset[]).filter((p) => typeof p?.name === "string" && typeof p?.query === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}

/** Saved table views (§11 DataTable presets) — per-admin, per-browser, in localStorage. */
export function FilterPresets({ storageKey, basePath }: { storageKey: string; basePath: string }) {
  const key = `admin-presets:${storageKey}`;
  const [presets, setPresets] = useState<Preset[]>([]);
  useEffect(() => setPresets(load(key)), [key]);

  const persist = (next: Preset[]) => {
    setPresets(next);
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage unavailable — presets just won't persist
    }
  };
  const save = () => {
    const name = window.prompt("Name this view")?.trim().slice(0, 40);
    if (!name) return;
    persist([...presets.filter((p) => p.name !== name), { name, query: window.location.search }]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={save}
        className="pressable hit inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-footnote font-semibold hover:bg-secondary"
      >
        <Bookmark className="h-4 w-4" aria-hidden /> Save view
      </button>
      {presets.map((p) => (
        <span key={p.name} className="inline-flex h-10 items-center rounded-full border bg-secondary/40 pl-3.5 text-footnote">
          <Link href={`${basePath}${p.query}`} className="hit inline-flex h-full items-center font-medium hover:underline">{p.name}</Link>
          <button
            type="button"
            onClick={() => persist(presets.filter((x) => x.name !== p.name))}
            aria-label={`Delete view ${p.name}`}
            className="pressable grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
