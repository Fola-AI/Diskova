import { BadgeCheck, ExternalLink, FileText, Inbox } from "lucide-react";
import Link from "next/link";

import { decideVendorAction, decideVerificationAction } from "@/app/admin/(secure)/vendors/actions";
import { DecisionForm } from "@/components/admin/decision-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedLinks } from "@/components/ui/segmented-links";
import { VendorTable } from "@/app/admin/(secure)/vendors/vendor-table";
import { one, type SearchParams } from "@/lib/admin/params";
import { requireRole } from "@/lib/auth/guards";
import { listVendorsForReview, listVerificationRequests } from "@/lib/services/admin/vendors";

/** Minimal vendor review queue (Stage L5). Extended — not rewritten — into the full §11.2 table in L12. */
export default async function AdminVendorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("admin", "/admin/vendors");
  const sp = await searchParams;
  const tab = one(sp, "tab") === "all" ? "all" : "queue";
  return (
    <div className="space-y-5">
      <SegmentedLinks
        label="Vendor views"
        className="w-full sm:w-auto"
        items={[
          { href: "/admin/vendors", label: "Review queue", active: tab === "queue" },
          { href: "/admin/vendors?tab=all", label: "All vendors", active: tab === "all" },
        ]}
      />
      {tab === "all" ? <VendorTable sp={sp} /> : <ReviewQueue />}
    </div>
  );
}

async function ReviewQueue() {
  const [vendors, requests] = await Promise.all([listVendorsForReview(), listVerificationRequests()]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-title font-semibold sm:text-display">Vendors awaiting review ({vendors.length})</h1>
        {vendors.length === 0 ? <EmptyState icon={Inbox} title="Nothing to review." compact>New listings appear here when a vendor submits them.</EmptyState> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {vendors.map((v) => {
            const meta = v as unknown as { city: { name: string } | null; category: { name: string } | null; owner: { username: string } | null; vendor_completeness: number | null };
            return (
              <Card key={v.id} data-testid="pending-vendor" className="flex flex-col">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-callout">{v.name}</CardTitle>
                  <p className="text-footnote text-muted-foreground">
                    {[meta.category?.name, meta.city?.name].filter(Boolean).join(" · ")} · by @{meta.owner?.username ?? "unknown"} ·{" "}
                    {meta.vendor_completeness ?? 0}% complete
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0">
                  <Link href={`/admin/vendors/${v.id}/preview`} className="hit inline-flex h-10 items-center gap-1.5 self-start text-sm font-semibold text-positive underline-offset-4 hover:underline" prefetch={false}>
                    <ExternalLink className="h-4 w-4" aria-hidden /> Preview listing
                  </Link>
                  <div className="mt-auto border-t pt-3">
                    <DecisionForm action={decideVendorAction} idName="vendorId" idValue={v.id} approveLabel="Approve & publish" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-title font-semibold">Verification &amp; claim requests ({requests.length})</h2>
        {requests.length === 0 ? <EmptyState icon={BadgeCheck} title="No pending requests." compact /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((r) => (
            <Card key={r.id} data-testid="verification-request" className="flex flex-col">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-callout">
                  {r.vendor_name}
                  <Badge variant={r.is_claim ? "gold" : "secondary"}>{r.is_claim ? "Claim" : "Verification"}</Badge>
                </CardTitle>
                <p className="text-footnote text-muted-foreground">by @{r.submitter_username ?? "unknown"}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0 text-sm">
                {r.business_doc_url || r.id_doc_url || r.social_proof_url || r.note ? (
                  <ul className="divide-y rounded-xl border">
                    {r.business_doc_url ? <li className="flex min-h-11 flex-wrap items-center gap-x-2 px-3 py-2"><FileText className="h-4 w-4 text-muted-foreground" aria-hidden /><a href={r.business_doc_url} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Business document</a> <span className="text-footnote text-muted-foreground">(link valid 10 min)</span></li> : null}
                    {r.id_doc_url ? <li className="flex min-h-11 flex-wrap items-center gap-x-2 px-3 py-2"><FileText className="h-4 w-4 text-muted-foreground" aria-hidden /><a href={r.id_doc_url} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">Photo ID</a> <span className="text-footnote text-muted-foreground">(link valid 10 min)</span></li> : null}
                    {r.social_proof_url ? <li className="flex min-h-11 flex-wrap items-center gap-x-2 px-3 py-2"><ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden /><a href={r.social_proof_url} target="_blank" rel="nofollow noopener noreferrer" className="font-medium underline underline-offset-4">Social proof</a></li> : null}
                    {r.note ? <li className="px-3 py-2 text-muted-foreground">“{r.note}”</li> : null}
                  </ul>
                ) : null}
                <div className="mt-auto border-t pt-3">
                  <DecisionForm action={decideVerificationAction} idName="requestId" idValue={r.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
