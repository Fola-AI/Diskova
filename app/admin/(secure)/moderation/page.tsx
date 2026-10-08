import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BlocklistForm } from "@/components/admin/blocklist-form";
import { ModerationForm } from "@/components/admin/moderation-form";
import { ModerationShortcuts } from "@/components/admin/moderation-shortcuts";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { publicStorageUrl } from "@/lib/config";
import { crowdLabel } from "@/lib/directory/crowd";
import { listModerationQueue } from "@/lib/services/admin/moderation";
import { chipClass } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";

const TABS = [
  { source: undefined, label: "All open" },
  { source: "hold", label: "Holds" },
  { source: "auto_block", label: "Auto-blocked" },
  { source: "auto_flag", label: "Flagged" },
  { source: "user_report", label: "Reports" },
  { source: "vendor_dispute", label: "Disputes" },
  { source: "random_sample", label: "Random sample" },
];

function topScores(score: unknown): Array<[string, number]> {
  const out: Record<string, number> = {};
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === "number") out[k] = Math.max(out[k] ?? 0, val);
      else walk(val);
    }
  };
  walk(score);
  return Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 3);
}

/** Moderation queue (§11.3) with stats and A/R/S/N keyboard shortcuts. */
export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  await requireRole("moderator", "/admin/moderation");
  const source = (await searchParams).source;
  const [items, { data: statsRaw }] = await Promise.all([
    listModerationQueue({ source: TABS.some((t) => t.source === source) ? source : undefined }),
    getAdminSupabase().rpc("admin_moderation_stats"),
  ]);
  const stats = statsRaw as { open_total?: number; median_seconds_to_close_7d?: number | null; auto_flagged_7d?: number; human_actioned_7d?: number } | null;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h1 className="text-title font-semibold sm:text-display">Moderation queue</h1>
        <p className="text-footnote text-muted-foreground" data-testid="moderation-stats">
          {stats?.open_total ?? 0} open · 7 days: {stats?.human_actioned_7d ?? 0} human decisions, {stats?.auto_flagged_7d ?? 0} auto-flagged
          {stats?.median_seconds_to_close_7d ? `, median ${Math.round(stats.median_seconds_to_close_7d / 60)} min to close` : ""}
        </p>
        <ModerationShortcuts />
        <BlocklistForm />
      </div>
      <nav className="rail fade-x -mx-4 gap-2 px-4 py-1" aria-label="Queue filters">
        {TABS.map((t) => {
          const selected = (t.source ?? "") === (source ?? "");
          return (
            <Link key={t.label} href={t.source ? `/admin/moderation?source=${t.source}` : "/admin/moderation"}
              aria-current={selected ? "page" : undefined} className={chipClass(selected)}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      {items.length === 0 ? <EmptyState icon={CheckCircle2} title="Queue is clear." compact>Nothing waiting in this view.</EmptyState> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const p = item.post;
          const ageDays = p?.author ? Math.floor((Date.now() - new Date(p.author.created_at).getTime()) / 86_400_000) : null;
          return (
            <Card key={item.id} data-testid="moderation-item" className="flex flex-col scroll-mt-24 transition-shadow duration-micro data-[current]:ring-2 data-[current]:ring-primary">
              <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0 p-4 pb-3">
                <Badge variant={item.priority === 1 ? "destructive" : item.priority === 2 ? "gold" : "secondary"}>
                  {item.priority === 1 ? <AlertTriangle aria-hidden /> : null}P{item.priority}
                </Badge>
                <Badge variant="outline">{item.source.replace("_", " ")}</Badge>
                <span className="text-footnote text-muted-foreground">{item.entity_type} · {formatDistanceToNowStrict(new Date(item.opened_at), { addSuffix: true })}</span>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0 text-sm">
                {p ? (
                  <>
                    <div className="space-y-1">
                      <p>
                        <span className="font-medium">{p.kind}</span> at{" "}
                        {p.vendor ? <Link href={`/v/${p.vendor.slug}`} className="underline">{p.vendor.name}</Link> : "unknown venue"} ·{" "}
                        {crowdLabel(p.crowd_level)} · status <strong>{p.status}</strong>
                        {p.hold_reason !== "none" ? ` (hold: ${p.hold_reason.replace(/_/g, " ")})` : ""}
                      </p>
                      {p.body ? <p className="whitespace-pre-line rounded-xl bg-secondary/70 px-3 py-2.5 leading-relaxed" data-testid="moderation-body">{p.body}</p> : null}
                      {p.media.length ? (
                        <div className="flex flex-wrap gap-2">
                          {p.media.map((m) => (
                            <div key={m.storage_path} className="relative h-24 w-24 overflow-hidden rounded-xl bg-secondary">
                              <Image src={publicStorageUrl("media", m.storage_path)} alt="" fill sizes="80px" className="object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-0.5 rounded-xl border p-3 text-footnote">
                        <p className="mb-1 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Moderation scores</p>
                        {topScores(p.moderation_score).map(([k, v]) => <p key={k} className="flex justify-between gap-2"><span>{k}</span><span className="font-mono tabular-nums">{v.toFixed(2)}</span></p>)}
                        <p>Decision: {p.moderation_decision ?? "—"} · reports: {p.report_count}</p>
                      </div>
                      {p.author ? (
                        <div className="space-y-0.5 rounded-xl border p-3 text-footnote">
                          <p className="mb-1 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Author</p>
                          <p className="font-semibold">@{p.author.username}</p>
                          <p>Trust {p.author.trust_score} · account {ageDays}d · {p.author.post_count} posts</p>
                          <p>Status {p.author.status}{p.author.is_shadowbanned ? " · shadowbanned" : ""}</p>
                        </div>
                      ) : null}
                    </div>
                    {item.heuristics ? (
                      <div className="space-y-0.5 rounded-xl border border-dashed p-3 text-footnote" data-testid="heuristics">
                        <p className="font-semibold">Signals (risk {item.heuristics.riskScore}/100)</p>
                        {item.heuristics.phashDuplicate ? <p className="text-destructive">Same photo posted at another venue (distance {item.heuristics.phashDuplicate.distance}) — escalates</p> : null}
                        {item.heuristics.burst ? <p className="text-destructive">{item.heuristics.postsLast10Min} posts in 10 minutes — escalates</p> : null}
                        <p className="text-muted-foreground">
                          Informational only: {item.heuristics.isAtVenue ? "at venue" : "not at venue"}
                          {item.heuristics.distanceFromVenueM !== null ? ` · ${item.heuristics.distanceFromVenueM} m away` : ""}
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : item.qa ? (
                  <div className="space-y-1" data-testid="moderation-qa">
                    <p className="text-footnote text-muted-foreground">
                      Q&amp;A {item.qa.kind} by @{item.qa.author ?? "deleted"} · status <strong>{item.qa.status}</strong> ·{" "}
                      <Link href={`/q/${item.qa.questionId}`} className="underline">open question</Link>
                    </p>
                    {item.qa.title ? <p className="font-medium">{item.qa.title}</p> : null}
                    {item.qa.body ? <p className="whitespace-pre-line rounded-xl bg-secondary/70 px-3 py-2.5 leading-relaxed">{item.qa.body}</p> : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Entity {item.entity_id}</p>
                )}
                {item.reports.length ? (
                  <ul className="list-disc space-y-0.5 pl-5 text-footnote text-muted-foreground">
                    {item.reports.map((r, i) => <li key={i}>{r.reason}{r.details ? `: ${r.details}` : ""}</li>)}
                  </ul>
                ) : null}
                <div className="mt-auto border-t pt-3">
                  <ModerationForm itemId={item.id} isPost={item.entity_type === "post" || item.qa !== null} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
