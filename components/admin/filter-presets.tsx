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
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <button type="button" onClick={save} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-secondary">
        <Bookmark className="h-3.5 w-3.5" aria-hidden /> Save view
      </button>
      {presets.map((p) => (
        <span key={p.name} className="inline-flex items-center rounded-full border pl-2">
          <Link href={`${basePath}${p.query}`} className="py-0.5">{p.name}</Link>
          <button type="button" onClick={() => persist(presets.filter((x) => x.name !== p.name))} aria-label={`Delete view ${p.name}`} className="px-1.5 py-0.5 text-muted-foreground">
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}
