import Link from "next/link";
import { redirect } from "next/navigation";

import { OfficialUpdateForm } from "@/components/vendor-dashboard/official-update-form";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { getCurrentVendor } from "@/lib/services/vendors";

export default async function OfficialUpdatePage() {
  const session = await requireVerifiedUser("/vendor/update");
  const current = await getCurrentVendor(session);
  if (!current) redirect("/vendor/onboarding");
  return (
    <div className="space-y-5">
      <div>
        <Link href="/vendor" className="text-sm text-muted-foreground hover:underline">← Dashboard</Link>
        <h1 className="mt-2 text-3xl font-semibold">Official update</h1>
        <p className="text-sm text-muted-foreground">
          {current.name} · shown as &quot;Official&quot; on your page for 24 hours and weighted 3× in the live crowd level.
        </p>
      </div>
      {current.status === "published" ? (
        <OfficialUpdateForm vendorId={current.id} vendorSlug={current.slug} />
      ) : (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          You can post official updates once your listing is approved.
        </p>
      )}
    </div>
  );
}
