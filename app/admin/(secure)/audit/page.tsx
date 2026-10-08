import { format } from "date-fns";
import { ChevronDown, Download, ScrollText } from "lucide-react";
import Link from "next/link";

import { AuditDiff } from "@/components/admin/audit-list";
import { FilterBar } from "@/components/admin/filter-bar";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
      <h1 className="text-title font-semibold sm:text-display">Audit log</h1>
      <p className="text-footnote text-muted-foreground">Append-only. Nobody — including super admins and the service role — can edit or delete entries.</p>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-footnote tabular-nums text-muted-foreground">{rows.length ? `${rows.length} entr${rows.length === 1 ? "y" : "ies"}${rows.length === LIMIT ? " (newest first)" : ""}` : ""}</span>
        <a href={`/admin/export/audit?${exportQuery.toString()}`} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="export-csv"><Download aria-hidden /> Export CSV</a>
      </div>
      <ul className="surface divide-y rounded-2xl text-sm" data-testid="audit-table">
        {rows.map((r) => (
          <li key={r.id} className="space-y-1 p-4" data-testid="audit-row">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-footnote">{r.action}</span>
              <span className="text-footnote text-muted-foreground">
                {format(new Date(r.at), "d MMM yyyy HH:mm:ss")} · {r.actor_id ? `@${names.get(r.actor_id) ?? r.actor_id.slice(0, 8)}` : "system"} ({r.actor_role ?? "—"}) · {r.entity_type}
                {r.entity_id ? ` ${r.entity_id.slice(0, 8)}` : ""}
              </span>
            </div>
            {r.reason ? <p className="text-footnote">Reason: “{r.reason}”</p> : null}
            <AuditDiff before={r.before} after={r.after} />
          </li>
        ))}
        {!rows.length ? <li className="p-2"><EmptyState icon={ScrollText} title="No entries." compact className="border-0 shadow-none">Try fewer filters.</EmptyState></li> : null}
      </ul>
      {rows.length === LIMIT ? (
        <Link href={hrefWith("/admin/audit", sp, { before: String(rows.at(-1)!.id) })} className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}>
          Older entries <ChevronDown aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
