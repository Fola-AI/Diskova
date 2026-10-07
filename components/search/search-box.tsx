"use client";

import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { typeahead } from "@/app/(public)/search/actions";
import { Input } from "@/components/ui/input";
import type { SearchHit } from "@/lib/db/directory";
import { SEARCH_KIND_LABEL, searchHitHref } from "@/lib/directory/search-href";

export function SearchBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState(defaultValue);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const listId = useId();
  const latest = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await typeahead(term);
        if (ticket === latest.current) setHits(res); // ignore out-of-order responses
      });
    }, 200); // §8.8: 200 ms debounce
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <form action="/search" method="get" role="search" className="relative" onSubmit={() => setOpen(false)}>
      <label htmlFor="search-q" className="sr-only">Search places, events and guides</label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        id="search-q"
        name="q"
        type="search"
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Search clubs, beaches, suya…"
        className="pl-9 pr-9"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {pending ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
      {open && hits.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
          {hits.map((h) => (
            <li key={`${h.kind}-${h.id}`} role="option" aria-selected={false}>
              <Link href={searchHitHref(h)} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-secondary">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{h.title}</span>
                  {h.subtitle ? <span className="block truncate text-xs text-muted-foreground">{h.subtitle}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{SEARCH_KIND_LABEL[h.kind]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
