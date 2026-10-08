"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Sticky in-page navigation for long city pages (docs/ux-audit.md 1.2). Scroll-spy keeps the pill on
 * the section in view; the pill slides (200ms spring). Sections stay in the DOM (SEO, no-JS, deep links).
 */
export function SectionNav({ sections }: { sections: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);

  useEffect(() => {
    const el = refs.current[active];
    if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
  }, [active]);

  return (
    <nav aria-label="On this page" className="sticky top-14 z-30 -mx-4 border-b border-border/60 bg-background/80 px-4 py-2 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="relative flex gap-1 rounded-xl bg-secondary/50 p-1">
        {pill ? (
          <span
            aria-hidden
            className="absolute bottom-1 left-0 top-1 rounded-lg bg-background shadow-[0_1px_3px_hsl(0_0%_0%/0.5),inset_0_1px_0_hsl(0_0%_100%/0.05)] transition-[transform,width] duration-200 ease-spring"
            style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
          />
        ) : null}
        {sections.map((s) => (
          <a
            key={s.id}
            ref={(el) => { refs.current[s.id] = el; }}
            href={`#${s.id}`}
            aria-current={active === s.id ? "location" : undefined}
            onClick={(e) => {
              const target = document.getElementById(s.id);
              if (!target) return;
              e.preventDefault();
              setActive(s.id);
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
              history.replaceState(null, "", `#${s.id}`);
            }}
            className={cn(
              "relative z-10 flex h-9 flex-1 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors duration-micro",
              active === s.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
