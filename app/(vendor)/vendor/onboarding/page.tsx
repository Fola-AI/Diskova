import Link from "next/link";

import { ClaimPanel } from "@/components/vendor-dashboard/claim-panel";
import { ListingNotice } from "@/components/vendor-dashboard/notice";
import { VendorEditor } from "@/components/vendor-dashboard/vendor-editor";
import { Button } from "@/components/ui/button";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getPublicSettings } from "@/lib/db/settings-public";
import { getCurrentVendor } from "@/lib/services/vendors";
import { VENDOR_STEPS, type VendorStep } from "@/lib/validation/vendor";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; new?: string; claim?: string }>;
}) {
  const session = await requireVerifiedUser("/vendor/onboarding");
  const params = await searchParams;

  if (params.claim) return <ClaimPanel session={session} slug={params.claim} />;

  const current = params.new ? null : await getCurrentVendor(session);
  const settings = await getPublicSettings();
  const step = (VENDOR_STEPS as readonly string[]).includes(params.step ?? "") ? (params.step as VendorStep) : "basics";

  if (current && !["draft", "rejected"].includes(current.status)) {
    return (
      <div className="space-y-4">
        <h1 className="text-display font-semibold">You already have a listing</h1>
        <p className="text-muted-foreground">
          {current.name} is {current.status.replace("_", " ")}. Edit it from your dashboard, or list another venue.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href="/vendor">Go to dashboard</Link></Button>
          <Button asChild variant="secondary"><Link href="/vendor/onboarding?new=1">List another venue</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-display font-semibold">{current ? `Finish listing ${current.name}` : "List your venue"}</h1>
        <p className="text-sm text-muted-foreground">Takes about 5 minutes. Your progress saves as you go.</p>
      </div>
      {step === "basics" ? <ListingNotice markdown={settings.monetisation_notice_md} /> : null}
      <VendorEditor session={session} vendorId={current?.id ?? null} step={current ? step : "basics"} basePath="/vendor/onboarding" mode="onboarding" />
    </div>
  );
}
