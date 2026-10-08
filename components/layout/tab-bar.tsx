"use client";

import { Bookmark, CalendarDays, Flame, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSignedIn } from "@/lib/client/use-signed-in";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean; prefetch?: boolean };

const HIDDEN = [/^\/admin/, /^\/login/, /^\/signup/, /^\/reset/, /^\/auth\//, /^\/preview/, /^\/offline/];

/**
 * Phone-only bottom tab bar (docs/ux-audit.md G8): the five primary destinations, always one thumb away.
 * The active indicator slides between tabs (220ms spring); active = colour + indicator + weight.
 */
export function TabBar({ showAsk }: { showAsk: boolean }) {
  const pathname = usePathname() ?? "/";
  const signedIn = useSignedIn();
  if (HIDDEN.some((r) => r.test(pathname))) return null;

  const tabs: Tab[] = [
    { href: "/", label: "Tonight", icon: Flame, match: (p) => p === "/" || p.startsWith("/c/") || p.startsWith("/v/") },
    { href: "/events", label: "Events", icon: CalendarDays, match: (p) => p.startsWith("/events") },
    ...(showAsk ? [{ href: "/assistant", label: "Ask", icon: Sparkles, match: (p: string) => p.startsWith("/assistant"), prefetch: false }] : []),
    { href: "/me/lists", label: "Saved", icon: Bookmark, match: (p) => p.startsWith("/me/lists") || p.startsWith("/l/"), prefetch: false },
    {
      href: signedIn === false ? "/login" : "/me",
      label: signedIn === false ? "Sign in" : "Me",
      icon: UserRound,
      match: (p) => (p.startsWith("/me") && !p.startsWith("/me/lists")) || p.startsWith("/vendor"),
      prefetch: false,
    },
  ];
  const active = tabs.findIndex((t) => t.match(pathname));

  return (
    <nav
      aria-label="Primary"
      className="tab-bar fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 sm:hidden"
    >
      <div className="relative flex h-[60px]">
        {active >= 0 ? (
          <span
            aria-hidden
            className="absolute top-0 h-[3px] rounded-b-full bg-positive transition-transform duration-[220ms] ease-spring"
            style={{ width: `${100 / tabs.length}%`, transform: `translateX(${active * 100}%) scaleX(0.4)` }}
          />
        ) : null}
        {tabs.map((t, i) => {
          const isActive = i === active;
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={t.href}
              prefetch={t.prefetch}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "pressable flex flex-1 flex-col items-center justify-center gap-1 text-caption",
                isActive ? "font-semibold text-positive" : "font-medium text-muted-foreground",
              )}
            >
              <Icon className={cn("h-6 w-6 transition-transform duration-micro ease-spring", isActive && "scale-110")} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
