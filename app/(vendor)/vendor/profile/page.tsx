import { redirect } from "next/navigation";

import { VendorEditor } from "@/components/vendor-dashboard/vendor-editor";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getCurrentVendor } from "@/lib/services/vendors";
import type { VendorStep } from "@/lib/validation/vendor";
import { BackLink } from "@/components/ui/back-link";

const STEPS: VendorStep[] = ["basics", "contact", "photos", "details", "prices"];

export default async function VendorProfilePage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const session = await requireVerifiedUser("/vendor/profile");
  const current = await getCurrentVendor(session);
  if (!current) redirect("/vendor/onboarding");
  const s = (await searchParams).step;
  const step = STEPS.includes(s as VendorStep) ? (s as VendorStep) : "basics";
  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/vendor">Dashboard</BackLink>
        <h1 className="mt-1 text-display font-semibold">Edit {current.name}</h1>
      </div>
      <VendorEditor session={session} vendorId={current.id} step={step} basePath="/vendor/profile" mode="edit" />
    </div>
  );
}
