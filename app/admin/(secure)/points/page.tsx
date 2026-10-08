import { AuditList } from "@/components/admin/audit-list";
import { PointsForm } from "@/components/admin/points-form";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { requireRole } from "@/lib/auth/guards";
import { BADGES } from "@/lib/services/points";

/** §11.13 points: adjust, reset, badge grant/revoke — every change audited with a reason. */
export default async function AdminPointsPage() {
  await requireRole("admin", "/admin/points");
  const admin = getAdminSupabase();
  const [{ data: top }, { data: recent }] = await Promise.all([
    admin.from("profiles").select("id, username, points, badges").is("deleted_at", null).order("points", { ascending: false }).limit(20),
    admin.rpc("admin_list_audit", { p_action_prefix: "points.", p_limit: 30 }),
  ]);
  return (
    <div className="space-y-5">
      <h1 className="text-title font-semibold sm:text-display">Points &amp; badges</h1>
      <section className="surface rounded-2xl p-4"><PointsForm badges={Object.values(BADGES)} /></section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-title font-semibold">Top 20</h2>
          <ol className="surface divide-y rounded-2xl text-sm">
            {(top ?? []).map((p, i) => (
              <li key={p.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                <span className="w-6 text-footnote tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1">@{p.username}{p.badges.length ? <span className="text-footnote text-muted-foreground"> · {p.badges.join(", ")}</span> : null}</span>
                <span className="font-semibold tabular-nums">{p.points}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="space-y-3">
          <h2 className="text-title font-semibold">Recent adjustments</h2>
          <AuditList rows={recent ?? []} />
        </section>
      </div>
    </div>
  );
}
