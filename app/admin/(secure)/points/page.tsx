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
      <h1 className="text-2xl font-semibold">Points &amp; badges</h1>
      <section className="rounded-xl border p-4"><PointsForm badges={Object.values(BADGES)} /></section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold">Top 20</h2>
          <ol className="divide-y rounded-xl border text-sm">
            {(top ?? []).map((p, i) => (
              <li key={p.id} className="flex gap-2 p-2">
                <span className="w-6 text-muted-foreground">{i + 1}</span>
                <span className="flex-1">@{p.username}{p.badges.length ? <span className="text-xs text-muted-foreground"> · {p.badges.join(", ")}</span> : null}</span>
                <span>{p.points}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold">Recent adjustments</h2>
          <AuditList rows={recent ?? []} />
        </section>
      </div>
    </div>
  );
}
