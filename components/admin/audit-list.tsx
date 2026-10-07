import { format } from "date-fns";

import type { Json } from "@/lib/db/types";

interface AuditRow { id: number; action: string; at: string; actor_role: string | null; reason: string | null; before: Json; after: Json }

type Flat = Record<string, string>;
function flatten(v: Json, prefix = "", out: Flat = {}): Flat {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, val] of Object.entries(v)) flatten(val as Json, prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix) {
    out[prefix] = v === null || v === undefined ? "∅" : typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}

/** Field-level before → after diff (§11.12 diff viewer). */
export function AuditDiff({ before, after }: { before: Json; after: Json }) {
  const b = flatten(before);
  const a = flatten(after);
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => b[k] !== a[k]).slice(0, 40);
  if (!keys.length) return null;
  return (
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]" data-testid="audit-diff">
      {keys.map((k) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">
            {k in b ? <del className="text-destructive">{b[k]!.slice(0, 200)}</del> : null}
            {k in b && k in a ? " → " : null}
            {k in a ? <ins className="text-positive no-underline">{a[k]!.slice(0, 200)}</ins> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditList({ rows }: { rows: AuditRow[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">No entries.</p>;
  return (
    <ul className="divide-y rounded-xl border text-sm">
      {rows.map((r) => (
        <li key={r.id} className="p-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-xs">{r.action}</span>
            <span className="text-xs text-muted-foreground">{format(new Date(r.at), "d MMM yyyy HH:mm")} · {r.actor_role ?? "system"}</span>
          </div>
          {r.reason ? <p className="text-xs">“{r.reason}”</p> : null}
          <AuditDiff before={r.before} after={r.after} />
        </li>
      ))}
    </ul>
  );
}
