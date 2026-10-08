import type { Metadata } from "next";
import Link from "next/link";

import { ChevronRight, SearchX } from "lucide-react";

import { RecentSearches } from "@/components/search/recent-searches";
import { SearchBox } from "@/components/search/search-box";
import { Button } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { listCities, searchDirectory } from "@/lib/db/directory";
import { SEARCH_KIND_LABEL, searchHitHref } from "@/lib/directory/search-href";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";
  const [hits, cities] = await Promise.all([q.length >= 2 ? searchDirectory(q, undefined, 40) : [], listCities()]);
  const cityName = new Map(cities.map((c) => [c.id, c.name]));

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-display font-semibold">Search</h1>
      <SearchBox defaultValue={q} autoFocus={!q} />
      {q.length >= 2 ? (
        hits.length ? (
          <section aria-label="Results" className="space-y-2">
            <p className="text-footnote text-muted-foreground" role="status">{hits.length} {hits.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;</p>
            <ul className="surface divide-y overflow-hidden rounded-2xl" data-testid="search-results">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.id}`}>
                  <Link href={searchHitHref(h)} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 active:bg-secondary">
                    <span className="min-w-0">
                      <span className="block font-semibold">{h.title}</span>
                      <span className="block truncate text-footnote text-muted-foreground">
                        {[h.subtitle, h.city_id ? cityName.get(h.city_id) : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-caption text-muted-foreground">{SEARCH_KIND_LABEL[h.kind]}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <EmptyState
            icon={SearchX}
            title={`Nothing for “${q}”`}
            action={
              <>
                <Button asChild variant="secondary"><Link href="/events">Browse events</Link></Button>
                <Button asChild variant="secondary"><Link href="/assistant" prefetch={false}>Ask the assistant</Link></Button>
              </>
            }
          >
            Try a venue name, an area (Lekki, Wuse) or a type of place (rooftop, suya).
          </EmptyState>
        )
      ) : (
        <div className="space-y-6">
          <RecentSearches />
          <section aria-labelledby="cities-heading" className="space-y-2">
            <h2 id="cities-heading" className="font-sans text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Browse a city</h2>
            <div className="flex flex-wrap gap-2">
              {cities.map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} className={chipClass(false)}>
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
          <section aria-labelledby="ideas-heading" className="space-y-2">
            <h2 id="ideas-heading" className="font-sans text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Try</h2>
            <div className="flex flex-wrap gap-2">
              {["Rooftop", "Suya", "Beach", "Live music", "Brunch", "Lounge"].map((t) => (
                <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className={chipClass(false)}>{t}</Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
