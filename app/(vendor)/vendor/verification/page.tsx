import { BadgeCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { VerificationForm } from "@/components/vendor-dashboard/verification-form";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getCurrentVendor } from "@/lib/services/vendors";
import { BackLink } from "@/components/ui/back-link";

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
        <BackLink href="/vendor">Dashboard</BackLink>
        <h1 className="mt-1 text-display font-semibold">Get verified</h1>
        <p className="text-sm text-muted-foreground">Verified venues show a badge and &quot;Official · Verified vendor&quot; on their updates.</p>
      </div>
      {current.verified ? (
        <p className="surface flex items-center gap-3 rounded-2xl p-4 text-sm"><BadgeCheck className="h-6 w-6 shrink-0 text-positive" aria-hidden /> {current.name} is verified.</p>
      ) : pending ? (
        <ol className="surface space-y-3 rounded-2xl p-4 text-sm" aria-label="Verification progress">
          <li className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-positive text-background" aria-hidden><BadgeCheck className="h-3.5 w-3.5" /></span> Submitted</li>
          <li className="flex items-center gap-3 font-semibold" aria-current="step"><span className="h-6 w-6 rounded-full border-2 border-accent bg-accent/20" aria-hidden /> In review — we&apos;ll email you when it&apos;s decided</li>
          <li className="flex items-center gap-3 text-muted-foreground"><span className="h-6 w-6 rounded-full border-2 border-muted-foreground/40" aria-hidden /> Verified</li>
        </ol>
      ) : (
        <>
          <section className="surface space-y-2 rounded-2xl p-4 text-sm" aria-labelledby="needs-heading">
            <h2 id="needs-heading" className="font-sans text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">What you&apos;ll need</h2>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden /> A clear photo of a business document (e.g. CAC certificate) or a photo ID</li>
              <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden /> PDF, JPG, PNG or WebP</li>
              <li className="flex items-start gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden /> Your venue&apos;s official Instagram or website</li>
            </ul>
          </section>
          {lastRejected?.rejection_reason ? (
            <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">Last request not approved: {lastRejected.rejection_reason}</p>
          ) : null}
          <VerificationForm vendorId={current.id} isClaim={false} />
        </>
      )}
    </div>
  );
}
