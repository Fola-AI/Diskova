import Link from "next/link";

import { decideVendorAction, decideVerificationAction } from "@/app/admin/(secure)/vendors/actions";
import { DecisionForm } from "@/components/admin/decision-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { listVendorsForReview, listVerificationRequests } from "@/lib/services/admin/vendors";

/** Minimal vendor review queue (Stage L5). Extended — not rewritten — into the full §11.2 table in L12. */
export default async function AdminVendorsPage() {
  await requireRole("admin", "/admin/vendors");
  const [vendors, requests] = await Promise.all([listVendorsForReview(), listVerificationRequests()]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Vendors awaiting review ({vendors.length})</h1>
        {vendors.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to review.</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {vendors.map((v) => {
            const meta = v as unknown as { city: { name: string } | null; category: { name: string } | null; owner: { username: string } | null; vendor_completeness: number | null };
            return (
              <Card key={v.id} data-testid="pending-vendor">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{v.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {[meta.category?.name, meta.city?.name].filter(Boolean).join(" · ")} · by @{meta.owner?.username ?? "unknown"} ·{" "}
                    {meta.vendor_completeness ?? 0}% complete
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href={`/admin/vendors/${v.id}/preview`} className="text-sm underline underline-offset-4" prefetch={false}>
                    Preview listing
                  </Link>
                  <DecisionForm action={decideVendorAction} idName="vendorId" idValue={v.id} approveLabel="Approve & publish" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Verification &amp; claim requests ({requests.length})</h2>
        {requests.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((r) => (
            <Card key={r.id} data-testid="verification-request">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {r.vendor_name}
                  <Badge variant={r.is_claim ? "gold" : "secondary"}>{r.is_claim ? "Claim" : "Verification"}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">by @{r.submitter_username ?? "unknown"}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <ul className="space-y-1">
                  {r.business_doc_url ? <li><a href={r.business_doc_url} target="_blank" rel="noopener noreferrer" className="underline">Business document</a> (link valid 10 min)</li> : null}
                  {r.id_doc_url ? <li><a href={r.id_doc_url} target="_blank" rel="noopener noreferrer" className="underline">Photo ID</a> (link valid 10 min)</li> : null}
                  {r.social_proof_url ? <li><a href={r.social_proof_url} target="_blank" rel="nofollow noopener noreferrer" className="underline">Social proof</a></li> : null}
                  {r.note ? <li className="text-muted-foreground">“{r.note}”</li> : null}
                </ul>
                <DecisionForm action={decideVerificationAction} idName="requestId" idValue={r.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
