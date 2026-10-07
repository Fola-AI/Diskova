import { format } from "date-fns";
import Link from "next/link";

import { AuditDiff } from "@/components/admin/audit-list";
import { FilterBar } from "@/components/admin/filter-bar";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { hrefWith, one, uuidParam, type SearchParams } from "@/lib/admin/params";
import { requireRole } from "@/lib/auth/guards";

const LIMIT = 100;

/** §11.12 audit log: read-only, append-only (DB-enforced), diff viewer, keyset pagination, export. */
export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("admin", "/admin/audit");
  const sp = await searchParams;
  const before = Number(one(sp, "before")) || undefined;
  const filters = {
    p_action_prefix: one(sp, "action"),
    p_entity_type: one(sp, "entity_type"),
    p_entity_id: one(sp, "entity_id"),
    p_actor_id: uuidParam(sp, "actor"),
  };
  const admin = getAdminSupabase();
  const { data } = await admin.rpc("admin_list_audit", { ...filters, p_before_id: before, p_limit: LIMIT });
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await admin.from("profiles").select("id, username").in("id", actorIds) : { data: [] };
  const names = new Map((actors ?? []).map((a) => [a.id, a.username]));
  const exportQuery = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "before" ? [[k, v]] : [])));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="text-sm text-muted-foreground">Append-only. Nobody — including super admins and the service role — can edit or delete entries.</p>
      <FilterBar
        basePath="/admin/audit"
        sp={sp}
        presetKey="audit"
        fields={[
          { name: "action", label: "Action starts with", type: "text" },
          { name: "entity_type", label: "Entity type", type: "text" },
          { name: "entity_id", label: "Entity id", type: "text" },
          { name: "actor", label: "Actor id", type: "text" },
        ]}
      />
      <div className="flex justify-end">
        <a href={`/admin/export/audit?${exportQuery.toString()}`} className="rounded-md border px-2 py-1 text-xs hover:bg-secondary" data-testid="export-csv">Export CSV</a>
      </div>
      <ul className="divide-y rounded-xl border text-sm" data-testid="audit-table">
        {rows.map((r) => (
          <li key={r.id} className="space-y-1 p-3" data-testid="audit-row">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-xs">{r.action}</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(r.at), "d MMM yyyy HH:mm:ss")} · {r.actor_id ? `@${names.get(r.actor_id) ?? r.actor_id.slice(0, 8)}` : "system"} ({r.actor_role ?? "—"}) · {r.entity_type}
                {r.entity_id ? ` ${r.entity_id.slice(0, 8)}` : ""}
              </span>
            </div>
            {r.reason ? <p className="text-xs">Reason: “{r.reason}”</p> : null}
            <AuditDiff before={r.before} after={r.after} />
          </li>
        ))}
        {!rows.length ? <li className="p-3 text-muted-foreground">No entries.</li> : null}
      </ul>
      {rows.length === LIMIT ? <Link href={hrefWith("/admin/audit", sp, { before: String(rows.at(-1)!.id) })} className="text-sm underline">Older entries</Link> : null}
    </div>
  );
}
