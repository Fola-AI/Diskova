import Link from "next/link";

import { FilterPresets } from "@/components/admin/filter-presets";
import { Button } from "@/components/ui/button";
import { one, type SearchParams } from "@/lib/admin/params";

export type FilterField =
  | { name: string; label: string; type: "text" | "date" }
  | { name: string; label: string; type: "select"; options: Array<{ value: string; label: string }> }
  | { name: string; label: string; type: "checkbox" };

const control = "h-9 rounded-md border bg-background px-2 text-sm";

/** GET filter form — every filter lives in the URL so it can be shared, paged and saved as a preset. */
export function FilterBar({ basePath, fields, sp, presetKey, hidden = {} }: { basePath: string; fields: FilterField[]; sp: SearchParams; presetKey: string; hidden?: Record<string, string> }) {
  const clearHref = Object.keys(hidden).length ? `${basePath}?${new URLSearchParams(hidden).toString()}` : basePath;
  return (
    <form method="get" action={basePath} className="flex flex-wrap items-end gap-2 rounded-xl border p-3" data-testid="filter-bar">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {one(sp, "sort") ? <input type="hidden" name="sort" value={one(sp, "sort")} /> : null}
      {one(sp, "dir") ? <input type="hidden" name="dir" value={one(sp, "dir")} /> : null}
      {fields.map((f) =>
        f.type === "checkbox" ? (
          <label key={f.name} className="flex h-9 items-center gap-1.5 text-sm">
            <input type="checkbox" name={f.name} value="1" defaultChecked={one(sp, f.name) === "1"} className="h-4 w-4" />
            {f.label}
          </label>
        ) : (
          <label key={f.name} className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs text-muted-foreground sm:flex-none">
            {f.label}
            {f.type === "select" ? (
              <select name={f.name} defaultValue={one(sp, f.name) ?? ""} className={control}>
                <option value="">Any</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type} name={f.name} defaultValue={one(sp, f.name) ?? ""} className={control} />
            )}
          </label>
        ),
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">Apply</Button>
        <Link href={clearHref} className="text-sm text-muted-foreground underline-offset-4 hover:underline">Clear</Link>
        <FilterPresets storageKey={presetKey} basePath={basePath} />
      </div>
    </form>
  );
}
