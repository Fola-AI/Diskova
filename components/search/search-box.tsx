"use client";

import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { typeahead } from "@/app/(public)/search/actions";
import { rememberSearch } from "@/components/search/recent-searches";
import { Input } from "@/components/ui/input";
import type { SearchHit } from "@/lib/db/directory";
import { SEARCH_KIND_LABEL, searchHitHref } from "@/lib/directory/search-href";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function SearchBox({ defaultValue = "", autoFocus = false }: { defaultValue?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pending, startTransition] = useTransition();
  const listId = useId();
  const latest = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
        if (ticket === latest.current) {
          setHits(res); // ignore out-of-order responses
          setActive(-1);
        }
      });
    }, 200); // §8.8: 200 ms debounce
    return () => clearTimeout(timer);
  }, [q]);

  const expanded = open && hits.length > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!expanded) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? hits.length - 1 : i - 1)); }
    else if (e.key === "Escape") { setOpen(false); }
    else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      router.push(searchHitHref(hits[active]!));
      setOpen(false);
    }
  };

  return (
    <form action="/search" method="get" role="search" className="relative" onSubmit={() => { setOpen(false); rememberSearch(q); trackEvent("search_performed"); }}>
      <label htmlFor="search-q" className="sr-only">Search places, events and guides</label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        id="search-q"
        name="q"
        type="search"
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Search clubs, beaches, suya…"
        className="h-12 rounded-2xl pl-11 pr-12 text-base [&::-webkit-search-cancel-button]:hidden"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
      />
      <span className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
        {pending ? (
          <Loader2 className="mr-3.5 h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        ) : q ? (
          <button
            type="button"
            aria-label="Clear search"
            className="pressable grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => { setQ(""); setHits([]); inputRef.current?.focus(); }}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-muted-foreground/30"><X className="h-3 w-3" aria-hidden /></span>
          </button>
        ) : null}
      </span>
      {expanded ? (
        <ul id={listId} role="listbox" aria-label="Suggestions" className="enter-fade absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border bg-popover p-1.5 shadow-[0_16px_48px_-12px_hsl(0_0%_0%/0.7)]">
          {hits.map((h, i) => (
            <li key={`${h.kind}-${h.id}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={searchHitHref(h)}
                className={cn("flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-secondary", i === active && "bg-secondary")}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{h.title}</span>
                  {h.subtitle ? <span className="block truncate text-footnote text-muted-foreground">{h.subtitle}</span> : null}
                </span>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-caption text-muted-foreground">{SEARCH_KIND_LABEL[h.kind]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
