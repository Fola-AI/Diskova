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
    <div className="container max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <Link href="/admin" className="font-display text-xl font-semibold">Admin</Link>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {profile.username} · {profile.role.replace("_", " ")} · MFA verified
        </span>
      </div>
      <AdminNav role={profile.role} />
      {children}
    </div>
  );
}
