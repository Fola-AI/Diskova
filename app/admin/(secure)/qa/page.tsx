import { formatDistanceToNowStrict } from "date-fns";
import { ChevronDown, MessageCircleQuestion, Pin } from "lucide-react";
import Link from "next/link";

import { qaActionForm } from "@/app/admin/(secure)/qa/actions";
import { ActionForm } from "@/components/admin/action-form";
import { QaSeedForm } from "@/components/admin/qa-seed-form";
import { Badge } from "@/components/ui/badge";
import { chipClass } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { one, pick, type SearchParams } from "@/lib/admin/params";
import { requireRole } from "@/lib/auth/guards";
import { roleAtLeast } from "@/lib/auth/roles";
import { listQaAdmin } from "@/lib/services/admin/qa";

const STATUSES = ["published", "pending", "hidden", "removed"] as const;

/** P3 /admin/qa: moderate questions and answers, pin, and write pinned seed Q&A. */
export default async function AdminQaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireRole("moderator", "/admin/qa");
  const sp = await searchParams;
  const kind = one(sp, "kind") === "answer" ? "answer" : "question";
  const status = pick(one(sp, "status"), STATUSES);
  const pinned = one(sp, "pinned") === "1";
  const [rows, { data: cities }] = await Promise.all([listQaAdmin({ kind, status, pinned }), getAdminSupabase().from("cities").select("id, name").order("sort_order")]);
  const tab = (label: string, href: string, active: boolean) => (
    <Link key={label} href={href} aria-current={active ? "page" : undefined} className={chipClass(active)}>{label}</Link>
  );
  return (
    <div className="space-y-5">
      <h1 className="text-title font-semibold sm:text-display">Questions &amp; answers</h1>
      <nav className="rail fade-x -mx-4 gap-2 px-4 py-1" aria-label="Q&A views">
        {tab("Questions", "/admin/qa", kind === "question" && !status && !pinned)}
        {tab("Pinned", "/admin/qa?pinned=1", pinned)}
        {tab("Answers", "/admin/qa?kind=answer", kind === "answer" && !status)}
        {STATUSES.filter((s) => s !== "published").map((s) => tab(`${kind === "answer" ? "Answers" : "Questions"}: ${s}`, `/admin/qa?kind=${kind}&status=${s}`, status === s))}
      </nav>
      {roleAtLeast(session.profile.role, "admin") ? (
        <details className="surface group rounded-2xl">
          <summary className="hit flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2"><Pin className="h-4 w-4 text-muted-foreground" aria-hidden />New pinned question (seed)</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-micro group-open:rotate-180" aria-hidden />
          </summary>
          <div className="border-t p-4"><QaSeedForm cities={cities ?? []} /></div>
        </details>
      ) : null}
      <ul className="space-y-3" data-testid="admin-qa">
        {rows.map((r) => {
          const row = r as unknown as { id: string; title?: string; body: string | null; status: string; moderation_decision: string | null; is_pinned?: boolean; report_count: number; created_at: string; is_vendor_answer?: boolean; is_official?: boolean; vote_count?: number; answer_count?: number; author: { username: string } | null; vendor?: { slug: string; name: string } | null; city?: { slug: string; name: string } | null; question?: { id: string; title: string } | null };
          return (
            <li key={row.id} className="surface space-y-3 rounded-2xl p-4 text-sm" data-testid="admin-qa-row">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={row.status === "published" ? "secondary" : "destructive"}>{row.status}</Badge>
                {row.moderation_decision ? <Badge variant="outline">{row.moderation_decision.replace("_", " ")}</Badge> : null}
                {row.is_pinned ? <Badge variant="gold">pinned</Badge> : null}
                {row.is_official ? <Badge variant="gold">official</Badge> : null}
                {row.is_vendor_answer ? <Badge variant="outline">venue</Badge> : null}
                <span className="text-footnote text-muted-foreground">
                  @{row.author?.username ?? "deleted"} · {formatDistanceToNowStrict(new Date(row.created_at), { addSuffix: true })}
                  {row.report_count ? ` · ${row.report_count} reports` : ""}
                  {row.vendor ? ` · ${row.vendor.name}` : row.city ? ` · ${row.city.name}` : ""}
                </span>
              </div>
              {row.title ? <p className="text-callout font-semibold"><Link href={`/q/${row.id}`} className="underline-offset-4 hover:underline">{row.title}</Link></p> : null}
              {row.question ? <p className="text-footnote text-muted-foreground">On: <Link href={`/q/${row.question.id}`} className="underline">{row.question.title}</Link></p> : null}
              {row.body ? <p className="whitespace-pre-line leading-relaxed">{row.body}</p> : null}
              <div className="border-t pt-3">
              <ActionForm
                action={qaActionForm}
                hidden={{ kind, id: row.id }}
                reasonPlaceholder="Reason (required to hide or remove)"
                choices={[
                  ...(row.status !== "published" ? [{ value: "publish", label: "Publish" }] : []),
                  ...(row.status !== "hidden" ? [{ value: "hide", label: "Hide", destructive: true }] : []),
                  ...(row.status !== "removed" ? [{ value: "remove", label: "Remove", destructive: true }] : []),
                  ...(kind === "question" ? [row.is_pinned ? { value: "unpin", label: "Unpin" } : { value: "pin", label: "Pin" }] : []),
                ]}
              />
              </div>
            </li>
          );
        })}
        {!rows.length ? <li><EmptyState icon={MessageCircleQuestion} title="Nothing here." compact>No questions or answers match this view.</EmptyState></li> : null}
      </ul>
    </div>
  );
}
