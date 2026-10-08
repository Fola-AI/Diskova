"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Compact title bar that fades in under the site header once the page's <h1> scrolls away
 * (IntersectionObserver, no scroll listeners). Decorative duplicate of the h1 → aria-hidden.
 */
export function StickyTitle({ watchId, children }: { watchId: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(watchId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e!.isIntersecting && e!.boundingClientRect.top < 0), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [watchId]);
  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-x-0 top-14 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl transition-[opacity,transform] duration-200 ease-out supports-[backdrop-filter]:bg-background/65",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      )}
    >
      <div className="container flex h-12 max-w-3xl items-center gap-3 px-4">{children}</div>
    </div>
  );
}
