import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

import { ActivityStream, type ActivityItem } from "@/components/admin/activity-stream";
import { Sparkline } from "@/components/admin/sparkline";
import { Badge } from "@/components/ui/badge";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { getSession } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/roles";
import { getDashboard } from "@/lib/services/admin/dashboard";

export const dynamic = "force-dynamic";

function Tile({ label, value, href, spark, tone }: { label: string; value: number; href?: string; spark?: number[]; tone?: "warn" }) {
  const body = (
    <div className="flex h-full flex-col justify-between gap-1 rounded-xl border p-3" data-testid="kpi-tile">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={tone === "warn" && value > 0 ? "text-2xl font-semibold text-gold" : "text-2xl font-semibold"}>{value.toLocaleString("en-NG")}</span>
      {spark ? <Sparkline values={spark} label={label} className="text-positive" /> : null}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

/** §11.1 dashboard. */
export default async function AdminDashboard() {
  const session = await getSession();
  const isAdmin = roleAtLeast(session?.profile.role, "admin");
  const admin = getAdminSupabase();
  const [d, { data: activity }, { data: cities }, { data: recentAudit }] = await Promise.all([
    getDashboard(),
    admin.rpc("admin_list_activity", { p_limit: 60 }),
    admin.from("cities").select("id, name").order("sort_order"),
    admin.rpc("admin_list_audit", { p_limit: 8 }),
  ]);
  const s = d.summary;
  const col = (k: "signups" | "vendors" | "posts" | "official_updates" | "checkins" | "pulses") => d.series.map((r) => r[k]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="Signups 24h" value={s.signups_24h} spark={col("signups")} href="/admin/users" />
        <Tile label="Vendor signups 24h" value={s.vendor_signups_24h} spark={col("vendors")} href="/admin/vendors?tab=all" />
        <Tile label="Pending vendor reviews" value={s.vendors_pending_review} href="/admin/vendors" tone="warn" />
        <Tile label="Posts 24h" value={s.posts_24h} spark={col("posts")} href="/admin/posts" />
        <Tile label="Official updates 24h" value={s.official_updates_24h} spark={col("official_updates")} />
        <Tile label="Check-ins 24h" value={s.checkins_24h} spark={col("checkins")} />
        <Tile label="Pulses 24h" value={s.pulses_24h} spark={col("pulses")} />
        <Tile label="Live vendors" value={s.live_vendors} />
        <Tile label="Moderation P1" value={s.moderation_open_p1} href="/admin/moderation" tone="warn" />
        <Tile label="Moderation P2" value={s.moderation_open_p2} href="/admin/moderation" tone="warn" />
        <Tile label="Moderation P3+" value={s.moderation_open_p3_plus} href="/admin/moderation" />
        <Tile label="Open reports" value={s.open_reports} href="/admin/reports" tone="warn" />
        <Tile label="Open issue reports" value={s.open_issue_reports} href={isAdmin ? "/admin/issues" : undefined} tone="warn" />
        <Tile label="Users" value={s.users_total} />
        <Tile label="Vendors (verified)" value={s.vendors_verified} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityStream initial={(activity ?? []) as ActivityItem[]} cities={cities ?? []} />
        </div>
        <div className="space-y-4">
          <section className="space-y-2 rounded-xl border p-4" data-testid="needs-attention">
            <h2 className="font-semibold">Needs attention</h2>
            <ul className="space-y-1.5 text-sm">
              {d.pendingVendors.map((v) => (
                <li key={v.id}><Link href="/admin/vendors" className="underline-offset-4 hover:underline">Vendor review: {v.name}</Link> <span className="text-xs text-muted-foreground">waiting {formatDistanceToNowStrict(new Date(v.updated_at))}</span></li>
              ))}
              {d.pendingEvents.map((e) => (
                <li key={e.id}><Link href="/admin/events" className="underline-offset-4 hover:underline">Event review: {e.title}</Link></li>
              ))}
              {s.moderation_open_p1 ? <li><Link href="/admin/moderation" className="text-destructive underline-offset-4 hover:underline">{s.moderation_open_p1} P1 moderation item(s)</Link></li> : null}
              {d.unverifiedSafety ? <li><Link href="/admin/safety" className="underline-offset-4 hover:underline">{d.unverifiedSafety} safety entries never verified</Link></li> : null}
              {!d.pendingVendors.length && !d.pendingEvents.length && !s.moderation_open_p1 && !d.unverifiedSafety ? <li className="text-muted-foreground">All clear.</li> : null}
            </ul>
          </section>
          <section className="space-y-2 rounded-xl border p-4">
            <h2 className="font-semibold">Tasks due</h2>
            <ul className="space-y-1.5 text-sm">
              {d.tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant={t.priority === "urgent" ? "destructive" : t.priority === "high" ? "gold" : "secondary"}>{t.priority}</Badge>
                  <span className="flex-1">{t.title}</span>
                  {t.due_at ? <span className={new Date(t.due_at) < new Date() ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{formatDistanceToNowStrict(new Date(t.due_at), { addSuffix: true })}</span> : null}
                </li>
              ))}
              {!d.tasks.length ? <li className="text-muted-foreground">No open tasks.</li> : null}
            </ul>
            <Link href="/admin/tasks" className="text-xs underline underline-offset-4">All tasks</Link>
          </section>
          <section className="space-y-2 rounded-xl border p-4">
            <h2 className="font-semibold">Moderation (7 days)</h2>
            <p className="text-sm text-muted-foreground">
              {d.moderation?.open_total ?? 0} open · {d.moderation?.auto_flagged_7d ?? 0} auto-flagged · {d.moderation?.human_actioned_7d ?? 0} human decisions
              {d.moderation?.median_seconds_to_close_7d ? ` · median ${Math.round(d.moderation.median_seconds_to_close_7d / 60)} min to close` : ""}
            </p>
          </section>
          {isAdmin ? (
            <section className="space-y-2 rounded-xl border p-4">
              <h2 className="font-semibold">Recent admin actions</h2>
              <ul className="space-y-1 text-xs">
                {(recentAudit ?? []).map((a) => (
                  <li key={a.id}><span className="font-mono">{a.action}</span> <span className="text-muted-foreground">{formatDistanceToNowStrict(new Date(a.at), { addSuffix: true })}</span></li>
                ))}
              </ul>
              <Link href="/admin/audit" className="text-xs underline underline-offset-4">Audit log</Link>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
