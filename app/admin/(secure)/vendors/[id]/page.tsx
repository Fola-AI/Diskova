import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import { decideVerificationAction, vendorRowAction } from "@/app/admin/(secure)/vendors/actions";
import { ActionForm } from "@/components/admin/action-form";
import { AuditList } from "@/components/admin/audit-list";
import { DecisionForm } from "@/components/admin/decision-form";
import { NoteForm } from "@/components/admin/note-form";
import { VendorEditForm } from "@/components/admin/vendor-edit-form";
import { Badge } from "@/components/ui/badge";
import { chipClass } from "@/components/ui/chip";
import { requireRole } from "@/lib/auth/guards";
import { getVendorAdminDetail } from "@/lib/services/admin/vendors";

const TABS = ["overview", "posts", "members", "prices", "events", "verification", "reports", "audit", "notes"] as const;
type Tab = (typeof TABS)[number];

/** §11.2 vendor detail with tabs. */
export default async function AdminVendorDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  await requireRole("admin", `/admin/vendors/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getVendorAdminDetail(id);
  if (!d) notFound();
  const tabParam = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t === tabParam) ?? "overview";
  const v = d.vendor as typeof d.vendor & { city: { name: string } | null; area: { name: string } | null; category: { name: string } | null; owner: { id: string; username: string } | null };
  const base = `/admin/vendors/${id}`;
  const counts: Partial<Record<Tab, number>> = { posts: d.posts.length, members: d.members.length, prices: d.prices.length, events: d.events.length, verification: d.verification.length, reports: d.reports.length, notes: d.notes.length };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link href="/admin/vendors?tab=all" className="hit inline-flex h-10 items-center text-footnote font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">← All vendors</Link>
        <h1 className="flex flex-wrap items-center gap-2 text-title font-semibold sm:text-display">
          {v.name}
          <Badge variant="outline">{v.status.replace("_", " ")}</Badge>
          {v.verified ? <Badge variant="gold">Verified</Badge> : null}
        </h1>
        <p className="text-footnote text-muted-foreground">
          {[v.category?.name, v.area?.name, v.city?.name].filter(Boolean).join(" · ")} · {v.vendor_completeness ?? 0}% complete · owner{" "}
          {v.owner ? <Link href={`/admin/users/${v.owner.id}`} className="underline">@{v.owner.username}</Link> : "none"} ·{" "}
          <Link href={`${base}/preview`} className="underline">View as vendor (read-only)</Link>
          {v.status === "published" ? <> · <Link href={`/v/${v.slug}`} className="underline">Public page</Link></> : null}
        </p>
      </div>

      <nav className="rail fade-x -mx-4 gap-2 px-4 py-1" aria-label="Vendor tabs">
        {TABS.map((t) => (
          <Link key={t} href={t === "overview" ? base : `${base}?tab=${t}`} aria-current={t === tab ? "page" : undefined} className={chipClass(t === tab, "capitalize")}>
            {t}{counts[t] ? <span className="tabular-nums opacity-80"> ({counts[t]})</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="surface space-y-3 rounded-2xl p-4">
            <h2 className="text-callout font-semibold">Actions</h2>
            <ActionForm
              action={vendorRowAction}
              hidden={{ vendorId: id }}
              testId="vendor-actions"
              choices={[
                ...(v.status === "pending_review" ? [{ value: "approve", label: "Approve" }, { value: "reject", label: "Reject", destructive: true }] : []),
                v.verified ? { value: "unverify", label: "Remove verification", destructive: true } : { value: "verify", label: "Verify" },
                v.status === "suspended" ? { value: "unsuspend", label: "Reinstate" } : { value: "suspend", label: "Suspend", destructive: true },
              ]}
            />
            <p className="text-footnote text-muted-foreground">
              <Link href={`/admin/tasks?entity=vendor&id=${id}&title=${encodeURIComponent(`Follow up: ${v.name}`)}`} className="underline">Create a task</Link> for this vendor.
            </p>
          </section>
          <section className="surface space-y-3 rounded-2xl p-4">
            <h2 className="text-callout font-semibold">Edit listing</h2>
            <VendorEditForm vendorId={id} values={v} />
          </section>
        </div>
      ) : null}

      {tab === "posts" ? (
        <ul className="surface divide-y rounded-2xl text-sm">
          {d.posts.map((p) => {
            const author = (p as unknown as { author: { username: string } | null }).author;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <Badge variant="outline">{p.kind}</Badge>
                <Badge variant={p.status === "published" ? "secondary" : "destructive"}>{p.status}</Badge>
                <span className="min-w-0 flex-1">{p.body ?? "—"}</span>
                <span className="text-footnote text-muted-foreground">@{author?.username ?? "?"} · {formatDistanceToNowStrict(new Date(p.created_at), { addSuffix: true })}{p.report_count ? ` · ${p.report_count} reports` : ""}</span>
              </li>
            );
          })}
          {!d.posts.length ? <li className="px-4 py-3 text-muted-foreground">No posts.</li> : null}
        </ul>
      ) : null}

      {tab === "members" ? (
        <ul className="surface divide-y rounded-2xl text-sm">
          {d.members.map((m) => {
            const prof = (m as unknown as { profile: { id: string; username: string } | null }).profile;
            return (
              <li key={prof?.id ?? m.created_at} className="flex flex-wrap items-center gap-2 px-4 py-3">
                {prof ? <Link href={`/admin/users/${prof.id}`} className="underline">@{prof.username}</Link> : "—"}
                <Badge variant="outline">{m.role}</Badge>
                <span className="text-footnote text-muted-foreground">{m.accepted_at ? "accepted" : "invited"}</span>
              </li>
            );
          })}
          {!d.members.length ? <li className="px-4 py-3 text-muted-foreground">No members.</li> : null}
        </ul>
      ) : null}

      {tab === "prices" ? (
        <ul className="surface divide-y rounded-2xl text-sm">
          {d.prices.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="min-w-0 flex-1">{p.label}{p.note ? <span className="text-muted-foreground"> — {p.note}</span> : null}</span>
              <span className="font-semibold tabular-nums">₦{p.amount_ngn.toLocaleString("en-NG")}</span>
              {!p.is_active ? <Badge variant="outline">inactive</Badge> : null}
            </li>
          ))}
          {!d.prices.length ? <li className="px-4 py-3 text-muted-foreground">No prices.</li> : null}
        </ul>
      ) : null}

      {tab === "events" ? (
        <ul className="surface divide-y rounded-2xl text-sm">
          {d.events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <span className="min-w-0 flex-1">{e.title}</span>
              <Badge variant="outline">{e.status}</Badge>
              <span className="text-footnote text-muted-foreground">{format(new Date(e.starts_at), "d MMM yyyy")}</span>
            </li>
          ))}
          {!d.events.length ? <li className="px-4 py-3 text-muted-foreground">No events.</li> : null}
        </ul>
      ) : null}

      {tab === "verification" ? (
        <div className="space-y-3">
          {d.verification.map((r) => (
            <div key={r.id} className="surface space-y-3 rounded-2xl p-4 text-sm">
              <p className="font-semibold">{r.is_claim ? "Claim" : "Verification"} request by @{r.submitter_username ?? "unknown"}</p>
              <ul className="space-y-1">
                {r.business_doc_url ? <li><a href={r.business_doc_url} target="_blank" rel="noopener noreferrer" className="underline">Business document</a> (link valid 10 min)</li> : null}
                {r.id_doc_url ? <li><a href={r.id_doc_url} target="_blank" rel="noopener noreferrer" className="underline">Photo ID</a> (link valid 10 min)</li> : null}
                {r.social_proof_url ? <li><a href={r.social_proof_url} target="_blank" rel="nofollow noopener noreferrer" className="underline">Social proof</a></li> : null}
              </ul>
              <div className="border-t pt-3">
                <DecisionForm action={decideVerificationAction} idName="requestId" idValue={r.id} />
              </div>
            </div>
          ))}
          {!d.verification.length ? <p className="surface rounded-2xl p-4 text-sm text-muted-foreground">No pending verification or claim requests.</p> : null}
        </div>
      ) : null}

      {tab === "reports" ? (
        <ul className="surface divide-y rounded-2xl text-sm">
          {d.reports.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Badge variant="outline">{r.reason}</Badge>
              <Badge variant="secondary">{r.status}</Badge>
              <span className="min-w-0 flex-1">{r.details ?? ""}</span>
              <Link href={`/admin/reports?entity=vendor`} className="hit inline-flex h-10 items-center text-footnote font-semibold text-positive underline underline-offset-4">Open reports</Link>
            </li>
          ))}
          {!d.reports.length ? <li className="px-4 py-3 text-muted-foreground">No reports.</li> : null}
        </ul>
      ) : null}

      {tab === "audit" ? <AuditList rows={d.audit} /> : null}

      {tab === "notes" ? (
        <div className="space-y-3">
          <NoteForm entityType="public.vendors" entityId={id} back={base} />
          <AuditList rows={d.notes} />
        </div>
      ) : null}
    </div>
  );
}
