import Link from "next/link";

import { VerificationForm } from "@/components/vendor-dashboard/verification-form";
import { Button } from "@/components/ui/button";
import type { SessionContext } from "@/lib/auth/guards";
import { getVendorBySlug } from "@/lib/db/directory";

/** Claim flow for unowned (seed) listings: ID + proof → admin review → claimant becomes owner. */
export async function ClaimPanel({ session, slug }: { session: SessionContext; slug: string }) {
  const vendor = await getVendorBySlug(slug);
  if (!vendor || vendor.claim_status !== "unclaimed") {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">This listing can&apos;t be claimed</h1>
        <p className="text-muted-foreground">It may already be managed by its owner. If you think that&apos;s wrong, contact us.</p>
        <Button asChild variant="secondary"><Link href="/vendor">Back</Link></Button>
      </div>
    );
  }
  const { data: mine } = await session.supabase.rpc("my_verification_requests", { p_vendor_id: vendor.id });
  const pending = (mine ?? []).find((r) => r.status === "pending");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Claim {vendor.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[vendor.category?.name, vendor.area?.name, vendor.city?.name].filter(Boolean).join(" · ")}
        </p>
      </div>
      {pending ? (
        <p className="rounded-xl border p-4 text-sm">Your claim is in review. We&apos;ll email you when it&apos;s decided.</p>
      ) : (
        <VerificationForm vendorId={vendor.id} isClaim />
      )}
    </div>
  );
}
