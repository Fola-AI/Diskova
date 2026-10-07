import type { Metadata } from "next";
import Link from "next/link";

import { SearchBox } from "@/components/search/search-box";
import { listCities, searchDirectory } from "@/lib/db/directory";
import { SEARCH_KIND_LABEL, searchHitHref } from "@/lib/directory/search-href";

export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? "";
  const [hits, cities] = await Promise.all([q.length >= 2 ? searchDirectory(q, undefined, 40) : [], listCities()]);
  const cityName = new Map(cities.map((c) => [c.id, c.name]));

  return (
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-semibold">Search</h1>
      <SearchBox defaultValue={q} autoFocus={!q} />
      {q.length >= 2 ? (
        hits.length ? (
          <ul className="divide-y rounded-xl border bg-card" data-testid="search-results">
            {hits.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <Link href={searchHitHref(h)} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-secondary">
                  <span className="min-w-0">
                    <span className="block font-medium">{h.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[h.subtitle, h.city_id ? cityName.get(h.city_id) : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{SEARCH_KIND_LABEL[h.kind]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No results for &ldquo;{q}&rdquo;. Try a venue name, area or type of place.</p>
        )
      ) : (
        <div className="flex flex-wrap gap-2 text-sm">
          {cities.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`} className="rounded-full border px-3 py-1.5 hover:border-primary/60">
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
