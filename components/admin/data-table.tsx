import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Download, SearchX } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { chipClass } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { hrefWith, type SearchParams } from "@/lib/admin/params";
import { cn } from "@/lib/utils";

export interface Column<R> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: R) => ReactNode;
  /**
   * Phone card role (below `md`). Defaults: the first column is the card title, the next three are
   * meta fields, the rest fold into "More details". Desktop always shows every column.
   */
  mobile?: "title" | "meta" | "detail";
}

const caption = "text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground";

/**
 * Server-rendered DataTable (§11): server-side sort + pagination through the URL, so views are
 * linkable and saved as presets. Row checkboxes attach to an external bulk form via `form=`.
 *
 * One markup for every viewport: from `md` it is a real <table> (sticky header, 48px rows); below
 * `md` the same rows are restyled as stacked cards (title, meta grid, folded details).
 */
export function DataTable<R>({
  columns,
  rows,
  rowKey,
  total,
  page,
  pageSize,
  basePath,
  sp,
  sort,
  desc,
  exportHref,
  bulkFormId,
  testId = "data-table",
}: {
  columns: Column<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  sp: SearchParams;
  sort?: string;
  desc?: boolean;
  exportHref?: string;
  bulkFormId?: string;
  testId?: string;
}) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const pages = Math.ceil(total / pageSize);
  const cell = (row: R, c: Column<R>): ReactNode => {
    if (c.render) return c.render(row);
    const v = (row as Record<string, unknown>)[c.key];
    if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };

  const explicitTitle = columns.find((c) => c.mobile === "title");
  const roleOf = (c: Column<R>, i: number): "title" | "meta" | "detail" => {
    if (c.mobile) return c.mobile;
    if (explicitTitle) return i <= 3 ? "meta" : "detail";
    return i === 0 ? "title" : i <= 3 ? "meta" : "detail";
  };
  const roles = columns.map((c, i) => roleOf(c, i));
  const details = columns.filter((_, i) => roles[i] === "detail");
  const sortable = columns.filter((c) => c.sortable);
  const sortHref = (c: Column<R>) => hrefWith(basePath, sp, { sort: c.key, dir: sort === c.key && desc ? "asc" : "desc", page: null });
  const ariaSort = (c: Column<R>) => (sort === c.key ? (desc ? "descending" : "ascending") : undefined);
  const sortIcon = (c: Column<R>): ReactNode =>
    sort === c.key ? (desc ? <ArrowDown className="h-3.5 w-3.5" aria-hidden /> : <ArrowUp className="h-3.5 w-3.5" aria-hidden />) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span data-testid={`${testId}-count`} className="text-footnote tabular-nums text-muted-foreground">
          {total ? `Showing ${from}–${to} of ${total}` : "No results"}
        </span>
        {exportHref ? (
          <a href={exportHref} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="export-csv">
            <Download aria-hidden /> Export CSV
          </a>
        ) : null}
      </div>

      {sortable.length && rows.length > 1 ? (
        <div className="rail fade-x -mx-4 items-center gap-2 px-4 md:hidden">
          <span className={cn(caption, "inline-flex shrink-0 items-center gap-1")}>
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden /> Sort
          </span>
          {sortable.map((c) => (
            <Link key={c.key} href={sortHref(c)} aria-label={`Sort by ${c.label}`} aria-current={sort === c.key ? "true" : undefined} className={chipClass(sort === c.key)}>
              {c.label}
              {sortIcon(c)}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="md:max-h-[calc(100dvh-12rem)] md:overflow-auto md:rounded-2xl md:border md:bg-card">
        <table className="block w-full text-left text-sm md:table md:min-w-[640px]" data-testid={testId}>
          <thead className="hidden md:table-header-group">
            <tr>
              {bulkFormId ? (
                <th scope="col" className="sticky top-0 z-10 w-12 border-b bg-card px-3 py-3">
                  <span className="sr-only">Select</span>
                </th>
              ) : null}
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={ariaSort(c)}
                  className={cn("sticky top-0 z-10 whitespace-nowrap border-b bg-card px-3 py-3", caption, c.className)}
                >
                  {c.sortable ? (
                    <Link
                      href={sortHref(c)}
                      className={cn("hit -mx-1 inline-flex items-center gap-1 rounded-md px-1 hover:text-foreground", sort === c.key && "text-foreground")}
                      aria-label={`Sort by ${c.label}`}
                    >
                      {c.label}
                      {sortIcon(c)}
                    </Link>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="grid gap-2 md:table-row-group md:divide-y">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="surface relative grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl p-4 md:table-row md:h-12 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:transition-colors md:duration-micro md:hover:bg-secondary/40"
                data-testid={`${testId}-row`}
              >
                {bulkFormId ? (
                  <td className="absolute right-2 top-2 md:static md:px-3 md:py-3 md:align-middle">
                    <label className="grid h-11 w-11 cursor-pointer place-items-center md:h-auto md:w-auto">
                      <input type="checkbox" name="ids" value={rowKey(row)} form={bulkFormId} aria-label="Select row" className="h-5 w-5 accent-primary md:h-4 md:w-4" />
                    </label>
                  </td>
                ) : null}
                {columns.map((c, i) => {
                  const r = roles[i];
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "min-w-0 md:table-cell md:px-3 md:py-3 md:align-middle",
                        r === "title" && cn("order-first col-span-2 block text-callout font-semibold md:order-none md:text-sm md:font-normal", bulkFormId && "pr-10 md:pr-3"),
                        r === "meta" && "block",
                        r === "detail" && "hidden",
                        c.className,
                      )}
                    >
                      {r === "title" ? null : <span className={cn(caption, "mb-0.5 block md:hidden")}>{c.label}</span>}
                      {cell(row, c)}
                    </td>
                  );
                })}
                {details.length ? (
                  <td className="col-span-2 md:hidden">
                    <details className="group border-t pt-1">
                      <summary className="hit flex h-10 cursor-pointer list-none items-center justify-between text-footnote font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
                        More details
                        <ChevronDown className="h-4 w-4 transition-transform duration-micro group-open:rotate-180" aria-hidden />
                      </summary>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pb-1 pt-2">
                        {details.map((c) => (
                          <div key={c.key} className="min-w-0">
                            <dt className={cn(caption, "mb-0.5")}>{c.label}</dt>
                            <dd className="break-words">{cell(row, c)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </td>
                ) : null}
              </tr>
            ))}
            {!rows.length ? (
              <tr className="block md:table-row">
                <td colSpan={columns.length + (bulkFormId ? 1 : 0)} className="block md:table-cell md:p-4">
                  <EmptyState icon={SearchX} title="Nothing matches" compact className="md:border-0 md:shadow-none">
                    Try fewer filters, or clear them to see everything.
                  </EmptyState>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {total > pageSize ? (
        <nav className="flex items-center justify-between gap-2 sm:justify-end" aria-label="Pagination">
          {page > 1 ? (
            <Link href={hrefWith(basePath, sp, { page: String(page - 1) })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ChevronLeft aria-hidden /> Previous
            </Link>
          ) : (
            <span aria-hidden className="w-[6.5rem] sm:hidden" />
          )}
          <span className="text-footnote tabular-nums text-muted-foreground">Page {page} of {pages}</span>
          {to < total ? (
            <Link href={hrefWith(basePath, sp, { page: String(page + 1) })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Next <ChevronRight aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className="w-[6.5rem] sm:hidden" />
          )}
        </nav>
      ) : null}
    </div>
  );
}
