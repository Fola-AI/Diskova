"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { UserRole } from "@/lib/auth/roles";
import { roleAtLeast } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const ITEMS: Array<{ href: string; label: string; min: UserRole }> = [
  { href: "/admin", label: "Dashboard", min: "moderator" },
  { href: "/admin/moderation", label: "Moderation", min: "moderator" },
  { href: "/admin/posts", label: "Posts", min: "moderator" },
  { href: "/admin/reports", label: "Reports", min: "moderator" },
  { href: "/admin/qa", label: "Q&A", min: "moderator" },
  { href: "/admin/users", label: "Users", min: "moderator" },
  { href: "/admin/tasks", label: "Tasks", min: "moderator" },
  { href: "/admin/vendors", label: "Vendors", min: "admin" },
  { href: "/admin/events", label: "Events", min: "admin" },
  { href: "/admin/content", label: "Content", min: "admin" },
  { href: "/admin/itineraries", label: "Itineraries", min: "admin" },
  { href: "/admin/safety", label: "Safety info", min: "admin" },
  { href: "/admin/issues", label: "Issues", min: "admin" },
  { href: "/admin/cities", label: "Cities", min: "admin" },
  { href: "/admin/points", label: "Points", min: "admin" },
  { href: "/admin/audit", label: "Audit log", min: "admin" },
  { href: "/admin/settings", label: "Settings", min: "super_admin" },
];

export function AdminNav({ role }: { role: UserRole }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin sections" className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none]">
      {ITEMS.filter((i) => roleAtLeast(role, i.min)).map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("shrink-0 rounded-full border px-3 py-1.5", active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary")}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
