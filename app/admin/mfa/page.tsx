import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MfaPanel } from "@/components/admin/mfa-panel";
import { AuthShell } from "@/components/auth/auth-shell";
import { requireUser } from "@/lib/auth/guards";
import { isStaffRole } from "@/lib/auth/roles";
import { safeNext } from "@/lib/auth/safe-next";
import { BRAND_NAME } from "@/lib/config";

export const metadata: Metadata = { title: "Two-factor authentication", robots: { index: false, follow: false } };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string; reverify?: string }> }) {
  const { profile } = await requireUser("/admin/mfa");
  if (!isStaffRole(profile.role)) notFound();
  const sp = await searchParams;
  const next = safeNext(sp.next, "/admin");

  return (
    <AuthShell
      title="Two-factor authentication"
      description={sp.reverify ? "This action is sensitive. Confirm it is you with a fresh authenticator code, then try again." : "Admin areas need an authenticator app code every time you sign in."}
    >
      <MfaPanel next={next} issuer={BRAND_NAME} />
    </AuthShell>
  );
}
