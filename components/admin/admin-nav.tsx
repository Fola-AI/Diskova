"use client";

import {
  BookOpen,
  CalendarDays,
  Flag,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageCircleQuestion,
  MessagesSquare,
  Route,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Store,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { UserRole } from "@/lib/auth/roles";
import { roleAtLeast } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  min: UserRole;
  icon: LucideIcon;
}

const GROUPS: Array<{ id: string; label: string; items: NavItem[] }> = [
  {
    id: "overview",
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", min: "moderator", icon: LayoutDashboard }],
  },
  {
    id: "moderation",
    label: "Moderation",
    items: [
      { href: "/admin/moderation", label: "Moderation", min: "moderator", icon: ShieldAlert },
      { href: "/admin/reports", label: "Reports", min: "moderator", icon: Flag },
      { href: "/admin/posts", label: "Posts", min: "moderator", icon: MessagesSquare },
      { href: "/admin/qa", label: "Q&A", min: "moderator", icon: MessageCircleQuestion },
      { href: "/admin/issues", label: "Issues", min: "admin", icon: TriangleAlert },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/vendors", label: "Vendors", min: "admin", icon: Store },
      { href: "/admin/events", label: "Events", min: "admin", icon: CalendarDays },
      { href: "/admin/content", label: "Content", min: "admin", icon: BookOpen },
      { href: "/admin/itineraries", label: "Itineraries", min: "admin", icon: Route },
      { href: "/admin/safety", label: "Safety info", min: "admin", icon: ShieldCheck },
      { href: "/admin/cities", label: "Cities", min: "admin", icon: MapPin },
      { href: "/admin/points", label: "Points", min: "admin", icon: Star },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [{ href: "/admin/users", label: "Users", min: "moderator", icon: Users }],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/admin/tasks", label: "Tasks", min: "moderator", icon: ListChecks },
      { href: "/admin/audit", label: "Audit log", min: "admin", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", min: "super_admin", icon: Settings },
    ],
  },
];

/**
 * Grouped admin navigation. One <nav> for every viewport: a horizontally scrolling rail of chips on
 * phones, a sticky 240px sidebar from `lg`. Items are filtered by role (the server enforces it too).
 */
export function AdminNav({ role }: { role: UserRole }) {
  const path = usePathname();
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => roleAtLeast(role, i.min)) })).filter((g) => g.items.length);

  // Keep the current section in view on the phone rail (no-op in the desktop sidebar).
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path]);

  return (
    <nav
      aria-label="Admin sections"
      className="rail fade-x -mx-4 mb-6 items-center gap-2 px-4 pb-1 lg:sticky lg:top-20 lg:mx-0 lg:self-start lg:mb-0 lg:block lg:max-h-[calc(100dvh-6rem)] lg:space-y-5 lg:overflow-y-auto lg:px-0 lg:pb-6 lg:[mask-image:none] lg:[-webkit-mask-image:none]"
    >
      {groups.map((g, gi) => (
        <div key={g.id} className="flex shrink-0 items-center gap-2 lg:block">
          {gi > 0 ? <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-border lg:hidden" /> : null}
          <p id={`admin-nav-${g.id}`} className="shrink-0 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground lg:mb-1.5 lg:px-3">
            {g.label}
          </p>
          <ul aria-labelledby={`admin-nav-${g.id}`} className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-stretch lg:gap-0.5">
            {g.items.map((i) => {
              const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
              const Icon = i.icon;
              return (
                <li key={i.href} className="shrink-0">
                  <Link
                    ref={active ? activeRef : undefined}
                    href={i.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "pressable-soft hit relative inline-flex h-10 select-none items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm transition-colors duration-micro ease-out",
                      "lg:flex lg:h-11 lg:w-full lg:rounded-xl lg:border-0 lg:px-3",
                      "lg:before:absolute lg:before:inset-y-2.5 lg:before:left-0 lg:before:w-[3px] lg:before:rounded-full lg:before:transition-colors lg:before:duration-micro",
                      active
                        ? "border-transparent bg-primary font-semibold text-primary-foreground lg:bg-secondary lg:text-foreground lg:before:bg-primary"
                        : "border-border bg-secondary/40 font-medium text-foreground/90 hover:bg-secondary lg:bg-transparent lg:text-muted-foreground lg:hover:bg-secondary/60 lg:hover:text-foreground lg:before:bg-transparent",
                    )}
                  >
                    <Icon className="hidden h-4 w-4 shrink-0 lg:block" aria-hidden />
                    {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
