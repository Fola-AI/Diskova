import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { CategoryIcon } from "@/components/directory/category-icon";
import { Button } from "@/components/ui/button";
import type { AreaRow, CategoryRow } from "@/lib/db/directory";
import { FEATURES, PRICE_BANDS } from "@/lib/directory/constants";
import { cn } from "@/lib/utils";
import { filtersToQuery, type CityFilters } from "@/lib/validation/directory";

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

/** Works without JavaScript: chips are links, the panel is a GET form. */
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
  return (
    <div className="space-y-3">
      <nav aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip href={`${basePath}${filtersToQuery(filters, { category: undefined })}#places`} active={!filters.category}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.slug}
            href={`${basePath}${filtersToQuery(filters, { category: c.slug })}#places`}
            active={filters.category === c.slug}
          >
            <CategoryIcon icon={c.icon} className="h-3.5 w-3.5" />
            {c.name}
            <span className="text-muted-foreground">{c.count}</span>
          </Chip>
        ))}
      </nav>

      <details className="group rounded-xl border bg-card" open={activePanelFilters > 0 || undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filters{activePanelFilters ? ` (${activePanelFilters})` : ""}
          </span>
          <span className="text-xs text-muted-foreground group-open:hidden">Area, price, open now…</span>
        </summary>
        <form method="get" action={`${basePath}#places`} className="grid gap-3 border-t p-4 sm:grid-cols-2">
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          <label className="space-y-1 text-sm">
            <span className="font-medium">Area</span>
            <select name="area" defaultValue={filters.area ?? ""} className={selectClass}>
              <option value="">Anywhere</option>
              {areas.map((a) => (
                <option key={a.slug} value={a.slug}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Price</span>
            <select name="price" defaultValue={filters.price ?? ""} className={selectClass}>
              <option value="">Any price</option>
              {PRICE_BANDS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.symbol === p.label ? p.label : `${p.symbol} ${p.label}`}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Feature</span>
            <select name="feature" defaultValue={filters.feature ?? ""} className={selectClass}>
              <option value="">Any</option>
              {Object.entries(FEATURES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 self-end rounded-md border px-3 py-2.5 text-sm">
            <input type="checkbox" name="open" value="1" defaultChecked={Boolean(filters.open)}
              className="h-5 w-5 accent-[hsl(var(--primary))]" />
            Open now
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" className="flex-1">Apply</Button>
            <Button asChild variant="ghost">
              <Link href={`${basePath}${filtersToQuery({ category: filters.category })}`}>Clear</Link>
            </Button>
          </div>
        </form>
      </details>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground [&_span]:text-primary-foreground/80" : "bg-card hover:border-primary/60",
      )}
    >
      {children}
    </Link>
  );
}
