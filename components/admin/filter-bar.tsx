import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

import { FilterPresets } from "@/components/admin/filter-presets";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClass } from "@/components/ui/select";
import { one, type SearchParams } from "@/lib/admin/params";
import { cn } from "@/lib/utils";

export type FilterField =
  | { name: string; label: string; type: "text" | "date" }
  | { name: string; label: string; type: "select"; options: Array<{ value: string; label: string }> }
  | { name: string; label: string; type: "checkbox" };

const fieldLabel = "text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground";

/** GET filter form — every filter lives in the URL so it can be shared, paged and saved as a preset. */
export function FilterBar({ basePath, fields, sp, presetKey, hidden = {} }: { basePath: string; fields: FilterField[]; sp: SearchParams; presetKey: string; hidden?: Record<string, string> }) {
  const clearHref = Object.keys(hidden).length ? `${basePath}?${new URLSearchParams(hidden).toString()}` : basePath;
  const active = fields.filter((f) => (f.type === "checkbox" ? one(sp, f.name) === "1" : Boolean(one(sp, f.name)))).length;
  const inputs = fields.filter((f) => f.type !== "checkbox");
  const checks = fields.filter((f) => f.type === "checkbox");
  return (
    <form method="get" action={basePath} className="surface space-y-4 rounded-2xl p-4" data-testid="filter-bar">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {one(sp, "sort") ? <input type="hidden" name="sort" value={one(sp, "sort")} /> : null}
      {one(sp, "dir") ? <input type="hidden" name="dir" value={one(sp, "dir")} /> : null}

      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />
          Filters
          {active ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-caption font-semibold tabular-nums text-positive">{active} active</span>
          ) : (
            <span className="text-caption font-normal text-muted-foreground">None applied</span>
          )}
        </p>
      </div>

      {inputs.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {inputs.map((f) => (
            <label key={f.name} className={cn("flex min-w-0 flex-col gap-1.5", f.type === "text" && "col-span-2 sm:col-span-1")}>
              <span className={fieldLabel}>{f.label}</span>
              {f.type === "select" ? (
                <select name={f.name} defaultValue={one(sp, f.name) ?? ""} className={nativeSelectClass}>
                  <option value="">Any</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <Input type={f.type} name={f.name} defaultValue={one(sp, f.name) ?? ""} />
              )}
            </label>
          ))}
        </div>
      ) : null}

      {checks.length ? (
        <div className="flex flex-wrap gap-2">
          {checks.map((f) => (
            <label
              key={f.name}
              className="pressable-soft inline-flex h-11 cursor-pointer select-none items-center gap-2.5 rounded-xl border bg-secondary/40 px-3.5 text-sm font-medium hover:bg-secondary has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"
            >
              <input type="checkbox" name={f.name} value="1" defaultChecked={one(sp, f.name) === "1"} className="h-4 w-4 accent-primary" />
              {f.label}
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button type="submit">Apply</Button>
        <Link href={clearHref} className={cn(buttonVariants({ variant: "ghost" }), !active && "text-muted-foreground")}>
          <X aria-hidden /> Clear
        </Link>
        <div className="basis-full sm:ml-auto sm:basis-auto">
          <FilterPresets storageKey={presetKey} basePath={basePath} />
        </div>
      </div>
    </form>
  );
}
