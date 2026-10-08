import { redirect } from "next/navigation";

import { PricesEditor } from "@/components/vendor-dashboard/prices-editor";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getCurrentVendor } from "@/lib/services/vendors";
import { BackLink } from "@/components/ui/back-link";

export default async function VendorPricesPage() {
  const session = await requireVerifiedUser("/vendor/prices");
  const current = await getCurrentVendor(session);
  if (!current) redirect("/vendor/onboarding");
  const { data: prices } = await session.supabase
    .from("vendor_prices")
    .select("id, label, amount_ngn, note")
    .eq("vendor_id", current.id)
    .order("amount_ngn");
  return (
    <div className="space-y-5">
      <div>
        <BackLink href="/vendor">Dashboard</BackLink>
        <h1 className="mt-1 text-display font-semibold">Prices</h1>
      </div>
      <PricesEditor
        vendorId={current.id}
        initial={(prices ?? []).map((p) => ({ id: p.id, label: p.label, amount_ngn: String(p.amount_ngn), note: p.note ?? "" }))}
      />
    </div>
  );
}
