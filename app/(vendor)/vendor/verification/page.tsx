import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { VerificationForm } from "@/components/vendor-dashboard/verification-form";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getCurrentVendor } from "@/lib/services/vendors";

export default async function VerificationPage() {
  const session = await requireVerifiedUser("/vendor/verification");
  const current = await getCurrentVendor(session);
  if (!current) redirect("/vendor/onboarding");
  const { data: requests } = await session.supabase.rpc("my_verification_requests", { p_vendor_id: current.id });
  const pending = (requests ?? []).find((r) => r.status === "pending");
  const lastRejected = (requests ?? []).find((r) => r.status === "rejected");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/vendor" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
        <h1 className="mt-2 text-3xl font-semibold">Get verified</h1>
        <p className="text-sm text-muted-foreground">Verified venues show a badge and &quot;Official · Verified vendor&quot; on their updates.</p>
      </div>
      {current.verified ? (
        <p className="flex items-center gap-2 rounded-xl border p-4 text-sm"><BadgeCheck className="h-5 w-5 text-positive" aria-hidden /> {current.name} is verified.</p>
      ) : pending ? (
        <p className="rounded-xl border p-4 text-sm">Your request is in review. We&apos;ll email you when it&apos;s decided.</p>
      ) : (
        <>
          {lastRejected?.rejection_reason ? (
            <p className="rounded-xl border border-destructive/40 p-4 text-sm">Last request not approved: {lastRejected.rejection_reason}</p>
          ) : null}
          <VerificationForm vendorId={current.id} isClaim={false} />
        </>
      )}
    </div>
  );
}
