import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { requireRole } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Every /admin page (except /admin/mfa) requires a staff role AND an aal2 (MFA) session (§5). */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireRole("moderator", "/admin");
  return (
    <div className="container max-w-7xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Back office</p>
          <Link href="/admin" className="font-display text-title font-semibold">Admin</Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-footnote text-muted-foreground">
            @{profile.username} · {profile.role.replace("_", " ")}
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-footnote font-semibold text-positive">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            MFA verified
          </span>
        </div>
      </header>
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        <AdminNav role={profile.role} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
