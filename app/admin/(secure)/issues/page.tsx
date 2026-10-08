import { formatDistanceToNowStrict } from "date-fns";

import { Download, ShieldCheck } from "lucide-react";

import { IssueForm } from "@/components/admin/issue-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { requireRole } from "@/lib/auth/guards";

/** Private issue reports (§11.9) — admin only. Never shown publicly. Export is admin+ and audited. */
export default async function AdminIssuesPage() {
  await requireRole("admin", "/admin/issues");
  const { data } = await getAdminSupabase().rpc("admin_list_issue_reports", {});
  const reports = data ?? [];
  return (
    <div className="space-y-4">
      <h1 className="text-title font-semibold sm:text-display">Issue reports</h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-footnote text-muted-foreground">Private. Descriptions may contain third-party personal data — handle accordingly.</p>
        <a href="/admin/export/issues" download className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="export-csv"><Download aria-hidden /> Export CSV</a>
      </div>
      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="surface space-y-3 rounded-2xl p-4 text-sm" data-testid="issue-report">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={r.category === "safety" ? "destructive" : "secondary"}>{r.category}</Badge>
              <Badge variant="outline">{r.status}</Badge>
              <span className="text-footnote text-muted-foreground">
                {formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true })} · {[r.area_name, r.city_name].filter(Boolean).join(", ") || "no location"}
                {r.has_location ? " · GPS attached" : ""} · {r.reporter_username ? `@${r.reporter_username}` : r.reporter_email ?? "anonymous"}
              </span>
            </div>
            <p className="whitespace-pre-line leading-relaxed">{r.description}</p>
            {r.internal_note ? <p className="rounded-xl bg-secondary/60 px-3 py-2 text-footnote text-muted-foreground">Note: {r.internal_note}{r.handled_by_username ? ` (@${r.handled_by_username})` : ""}</p> : null}
            <div className="border-t pt-3">
              <IssueForm id={r.id} status={r.status} />
            </div>
          </li>
        ))}
        {!reports.length ? <li><EmptyState icon={ShieldCheck} title="No reports." compact /></li> : null}
      </ul>
    </div>
  );
}
