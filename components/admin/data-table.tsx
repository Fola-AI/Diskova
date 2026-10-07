import { ArrowDown, ArrowUp, Download } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { hrefWith, type SearchParams } from "@/lib/admin/params";
import { cn } from "@/lib/utils";

export interface Column<R> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: R) => ReactNode;
}

/**
 * Server-rendered DataTable (§11): server-side sort + pagination through the URL, so views are
 * linkable and saved as presets. Row checkboxes attach to an external bulk form via `form=`.
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
  const cell = (row: R, c: Column<R>): ReactNode => {
    if (c.render) return c.render(row);
    const v = (row as Record<string, unknown>)[c.key];
    if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span data-testid={`${testId}-count`}>{total ? `Showing ${from}–${to} of ${total}` : "No results"}</span>
        {exportHref ? (
          <a href={exportHref} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-secondary" data-testid="export-csv">
            <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
          </a>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-left text-sm" data-testid={testId}>
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {bulkFormId ? <th className="w-8 px-2 py-2"><span className="sr-only">Select</span></th> : null}
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("whitespace-nowrap px-3 py-2 font-medium", c.className)}>
                  {c.sortable ? (
                    <Link
                      href={hrefWith(basePath, sp, { sort: c.key, dir: sort === c.key && desc ? "asc" : "desc", page: null })}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      aria-label={`Sort by ${c.label}`}
                    >
                      {c.label}
                      {sort === c.key ? (desc ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />) : null}
                    </Link>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top hover:bg-secondary/30" data-testid={`${testId}-row`}>
                {bulkFormId ? (
                  <td className="px-2 py-2">
                    <input type="checkbox" name="ids" value={rowKey(row)} form={bulkFormId} aria-label="Select row" className="h-4 w-4" />
                  </td>
                ) : null}
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2", c.className)}>{cell(row, c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > pageSize ? (
        <nav className="flex items-center justify-end gap-2 text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={hrefWith(basePath, sp, { page: String(page - 1) })} className="rounded-md border px-3 py-1">Previous</Link> : null}
          <span className="text-xs text-muted-foreground">Page {page} of {Math.ceil(total / pageSize)}</span>
          {to < total ? <Link href={hrefWith(basePath, sp, { page: String(page + 1) })} className="rounded-md border px-3 py-1">Next</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
