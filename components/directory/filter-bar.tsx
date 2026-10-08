import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

import { CategoryIcon } from "@/components/directory/category-icon";
import { Button } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { nativeSelectClass } from "@/components/ui/select";
import type { AreaRow, CategoryRow } from "@/lib/db/directory";
import { FEATURES, PRICE_BANDS } from "@/lib/directory/constants";
import { cn } from "@/lib/utils";
import { filtersToQuery, type CityFilters } from "@/lib/validation/directory";

/** Works without JavaScript: chips are links, the panel is a GET form. Active filters are removable chips. */
export function FilterBar({
  basePath,
  filters,
  categories,
  areas,
}: {
  basePath: string;
  filters: CityFilters;
  categories: Array<CategoryRow & { count: number }>;
  areas: AreaRow[];
}) {
  const activePanelFilters = [filters.area, filters.price, filters.feature, filters.open].filter(Boolean).length;
  const active: Array<{ key: keyof CityFilters; label: string }> = [];
  if (filters.area) active.push({ key: "area", label: areas.find((a) => a.slug === filters.area)?.name ?? filters.area });
  if (filters.price) active.push({ key: "price", label: PRICE_BANDS.find((p) => p.value === filters.price)?.label ?? filters.price });
  if (filters.feature) active.push({ key: "feature", label: FEATURES[filters.feature as keyof typeof FEATURES] ?? filters.feature });
  if (filters.open) active.push({ key: "open", label: "Open now" });

  return (
    <div className="space-y-3">
      <nav aria-label="Categories" className="rail fade-x -mx-4 gap-2 px-4 py-1">
        <Link href={`${basePath}${filtersToQuery(filters, { category: undefined })}#places`} scroll={false} aria-current={!filters.category ? "page" : undefined} className={chipClass(!filters.category)}>
          All
        </Link>
        {categories.map((c) => {
          const on = filters.category === c.slug;
          return (
            <Link
              key={c.slug}
              href={`${basePath}${filtersToQuery(filters, { category: c.slug })}#places`}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={chipClass(on)}
            >
              <CategoryIcon icon={c.icon} className="h-4 w-4" />
              {c.name}
              <span className={cn("rounded-full px-1.5 text-caption tabular-nums", on ? "bg-white/20 text-primary-foreground" : "bg-secondary text-muted-foreground")}>{c.count}</span>
            </Link>
          );
        })}
        <span className="w-2 shrink-0" aria-hidden />
      </nav>

      {active.length ? (
        <ul className="flex flex-wrap gap-2" aria-label="Active filters">
          {active.map((f) => (
            <li key={f.key}>
              <Link
                href={`${basePath}${filtersToQuery(filters, { [f.key]: undefined })}#places`}
                scroll={false}
                className="pressable hit inline-flex h-9 items-center gap-1.5 rounded-full bg-primary/15 pl-3 pr-2 text-footnote font-medium text-positive hover:bg-primary/25"
                aria-label={`Remove filter: ${f.label}`}
              >
                {f.label}
                <X className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <details className="surface group rounded-2xl [&_summary::-webkit-details-marker]:hidden" open={activePanelFilters > 0 || undefined}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters
            {activePanelFilters ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-caption font-semibold text-primary-foreground">{activePanelFilters}</span> : null}
          </span>
          <span className="text-footnote text-muted-foreground group-open:hidden">Area, price, open now…</span>
        </summary>
        <form method="get" action={`${basePath}#places`} className="grid gap-3 border-t p-4 sm:grid-cols-2">
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Area</span>
            <select name="area" defaultValue={filters.area ?? ""} className={nativeSelectClass}>
              <option value="">Anywhere</option>
              {areas.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Price</span>
            <select name="price" defaultValue={filters.price ?? ""} className={nativeSelectClass}>
              <option value="">Any price</option>
              {PRICE_BANDS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.symbol === p.label ? p.label : `${p.symbol} ${p.label}`}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Feature</span>
            <select name="feature" defaultValue={filters.feature ?? ""} className={nativeSelectClass}>
              <option value="">Any</option>
              {Object.entries(FEATURES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-xl border bg-secondary/40 px-3.5 py-2.5 text-sm">
            <input type="checkbox" name="open" value="1" defaultChecked={Boolean(filters.open)} className="h-5 w-5" />
            Open now
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" className="flex-1">Apply filters</Button>
            <Button asChild variant="ghost">
              <Link href={`${basePath}${filtersToQuery({ category: filters.category })}`}>Clear</Link>
            </Button>
          </div>
        </form>
      </details>
    </div>
  );
}
