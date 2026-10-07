import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

import { resolveReportForm } from "@/app/admin/(secure)/reports/actions";
import { ActionForm } from "@/components/admin/action-form";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { hrefWith, one, pageOf, pick, type SearchParams } from "@/lib/admin/params";
import { requireRole } from "@/lib/auth/guards";
import { Constants } from "@/lib/db/types";
import { PAGE_SIZE } from "@/lib/services/admin/common";
import { listReportsAdmin } from "@/lib/services/admin/reports";

const E = Constants.public.Enums;
const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x.replace(/_/g, " ") }));

/** §11.8 reports. Report content is open in the moderation queue too; here every report is listed and resolvable. */
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("moderator", "/admin/reports");
  const sp = await searchParams;
  const page = pageOf(sp);
  const status = one(sp, "status") === "all" ? undefined : pick(one(sp, "status"), E.report_status) ?? "open";
  const { rows, total } = await listReportsAdmin({ status, entity: pick(one(sp, "entity"), E.report_entity), reason: pick(one(sp, "reason"), E.report_reason), offset: (page - 1) * PAGE_SIZE });
  const target = (type: string, id: string) =>
    type === "vendor" ? `/admin/vendors/${id}` : type === "profile" ? `/admin/users/${id}` : type === "post" ? "/admin/moderation?source=user_report" : "/admin/events";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports ({total})</h1>
      <FilterBar
        basePath="/admin/reports"
        sp={sp}
        presetKey="reports"
        fields={[
          { name: "status", label: "Status (default open)", type: "select", options: [{ value: "all", label: "All" }, ...opts(E.report_status)] },
          { name: "entity", label: "Entity", type: "select", options: opts(E.report_entity) },
          { name: "reason", label: "Reason", type: "select", options: opts(E.report_reason) },
        ]}
      />
      <ul className="space-y-3">
        {rows.map((r) => {
          const reporter = (r as unknown as { reporter: { username: string; trust_score: number } | null }).reporter;
          return (
            <li key={r.id} className="space-y-2 rounded-xl border p-4 text-sm" data-testid="report-row">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{r.entity_type}</Badge>
                <Badge variant={r.reason === "dangerous" ? "destructive" : "secondary"}>{r.reason.replace(/_/g, " ")}</Badge>
                <Badge variant="outline">{r.status.replace(/_/g, " ")}</Badge>
                <span className="text-xs text-muted-foreground">
                  by @{reporter?.username ?? "deleted"} (trust {reporter?.trust_score ?? "—"}) · {formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true })}
                </span>
                <Link href={target(r.entity_type, r.entity_id)} className="text-xs underline">Open {r.entity_type}</Link>
              </div>
              {r.details ? <p>{r.details}</p> : null}
              {r.resolution_note ? <p className="text-xs text-muted-foreground">Resolution: {r.resolution_note}</p> : null}
              {r.status === "open" || r.status === "reviewing" ? (
                <ActionForm
                  action={resolveReportForm}
                  hidden={{ id: r.id }}
                  reasonPlaceholder="Note (required to resolve or dismiss)"
                  choices={[
                    ...(r.status === "open" ? [{ value: "reviewing", label: "Mark reviewing" }] : []),
                    { value: "resolved_kept", label: "Resolve — keep" },
                    { value: "resolved_removed", label: "Resolve — removed", destructive: true },
                    { value: "dismissed", label: "Dismiss" },
                  ]}
                />
              ) : null}
            </li>
          );
        })}
        {!rows.length ? <li className="text-sm text-muted-foreground">No reports.</li> : null}
      </ul>
      {total > page * PAGE_SIZE ? <Link href={hrefWith("/admin/reports", sp, { page: String(page + 1) })} className="text-sm underline">Next page</Link> : null}
    </div>
  );
}
