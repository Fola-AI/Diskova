import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";

import { ActivityStream, type ActivityItem } from "@/components/admin/activity-stream";
import { Sparkline } from "@/components/admin/sparkline";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { getSession } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/roles";
import { getDashboard } from "@/lib/services/admin/dashboard";

export const dynamic = "force-dynamic";

const sectionCard = "surface space-y-3 rounded-2xl p-4";
const sectionTitle = "text-callout font-semibold";
const metaLink = "hit inline-flex h-10 items-center gap-1 text-footnote font-semibold text-positive underline-offset-4 hover:underline";

function Tile({ label, value, href, spark, tone }: { label: string; value: number; href?: string; spark?: number[]; tone?: "warn" }) {
  const attention = tone === "warn" && value > 0;
  const body = (
    <div
      className={cn(
        "surface flex h-full min-h-[7.5rem] flex-col justify-between gap-2 rounded-2xl p-4 transition-colors duration-micro",
        attention && "border-accent/50",
        href && "group-hover:border-muted-foreground/40",
      )}
      data-testid="kpi-tile"
    >
      <span className="flex items-start justify-between gap-2 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        <span>{label}</span>
        {href ? <ChevronRight className="h-4 w-4 shrink-0 opacity-60 transition-transform duration-micro group-hover:translate-x-0.5" aria-hidden /> : null}
      </span>
      <span className={cn("font-display text-display font-semibold tabular-nums leading-none", attention && "text-gold")}>
        {value.toLocaleString("en-NG")}
        {attention ? <span className="sr-only"> (needs attention)</span> : null}
      </span>
      {spark ? <Sparkline values={spark} label={label} className="h-8 w-full max-w-[120px] text-positive" /> : null}
    </div>
  );
  return href ? <Link href={href} className="pressable-soft group block rounded-2xl">{body}</Link> : body;
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
      <h1 className="text-title font-semibold sm:text-display">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
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

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityStream initial={(activity ?? []) as ActivityItem[]} cities={cities ?? []} />
        </div>
        <div className="space-y-4">
          <section className={sectionCard} data-testid="needs-attention">
            <h2 className={sectionTitle}>Needs attention</h2>
            <ul className="divide-y text-sm">
              {d.pendingVendors.map((v) => (
                <li key={v.id} className="py-1">
                  <Link href="/admin/vendors" className="hit flex min-h-10 flex-wrap items-center gap-x-2 underline-offset-4 hover:underline">
                    <span>Vendor review: {v.name}</span>
                    <span className="text-footnote text-muted-foreground">waiting {formatDistanceToNowStrict(new Date(v.updated_at))}</span>
                  </Link>
                </li>
              ))}
              {d.pendingEvents.map((e) => (
                <li key={e.id} className="py-1"><Link href="/admin/events" className="hit flex min-h-10 items-center underline-offset-4 hover:underline">Event review: {e.title}</Link></li>
              ))}
              {s.moderation_open_p1 ? (
                <li className="py-1">
                  <Link href="/admin/moderation" className="hit flex min-h-10 items-center gap-2 font-semibold text-destructive underline-offset-4 hover:underline">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {s.moderation_open_p1} P1 moderation item(s)
                  </Link>
                </li>
              ) : null}
              {d.unverifiedSafety ? <li className="py-1"><Link href="/admin/safety" className="hit flex min-h-10 items-center underline-offset-4 hover:underline">{d.unverifiedSafety} safety entries never verified</Link></li> : null}
              {!d.pendingVendors.length && !d.pendingEvents.length && !s.moderation_open_p1 && !d.unverifiedSafety ? (
                <li className="flex items-center gap-2 py-1 text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-positive" aria-hidden /> All clear.</li>
              ) : null}
            </ul>
          </section>
          <section className={sectionCard}>
            <h2 className={sectionTitle}>Tasks due</h2>
            <ul className="divide-y text-sm">
              {d.tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Badge variant={t.priority === "urgent" ? "destructive" : t.priority === "high" ? "gold" : "secondary"}>{t.priority}</Badge>
                  <span className="min-w-0 flex-1">{t.title}</span>
                  {t.due_at ? <span className={new Date(t.due_at) < new Date() ? "text-footnote font-semibold text-destructive" : "text-footnote text-muted-foreground"}>{new Date(t.due_at) < new Date() ? "Overdue · " : ""}{formatDistanceToNowStrict(new Date(t.due_at), { addSuffix: true })}</span> : null}
                </li>
              ))}
              {!d.tasks.length ? <li className="py-2 text-muted-foreground">No open tasks.</li> : null}
            </ul>
            <Link href="/admin/tasks" className={metaLink}>All tasks <ChevronRight className="h-4 w-4" aria-hidden /></Link>
          </section>
          <section className={sectionCard}>
            <h2 className={sectionTitle}>Moderation (7 days)</h2>
            <p className="text-sm text-muted-foreground">
              {d.moderation?.open_total ?? 0} open · {d.moderation?.auto_flagged_7d ?? 0} auto-flagged · {d.moderation?.human_actioned_7d ?? 0} human decisions
              {d.moderation?.median_seconds_to_close_7d ? ` · median ${Math.round(d.moderation.median_seconds_to_close_7d / 60)} min to close` : ""}
            </p>
          </section>
          {isAdmin ? (
            <section className={sectionCard}>
              <h2 className={sectionTitle}>Recent admin actions</h2>
              <ul className="divide-y text-footnote">
                {(recentAudit ?? []).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-2 py-1.5">
                    <span className="font-mono">{a.action}</span>
                    <span className="text-muted-foreground">{formatDistanceToNowStrict(new Date(a.at), { addSuffix: true })}</span>
                  </li>
                ))}
              </ul>
              <Link href="/admin/audit" className={metaLink}>Audit log <ChevronRight className="h-4 w-4" aria-hidden /></Link>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
