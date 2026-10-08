"use client";

import { ChevronDown, ListTree } from "lucide-react";
import { useEffect, useState } from "react";

/** 2px reading-progress bar under the header (1:1 with scroll; decorative). */
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div aria-hidden className="fixed inset-x-0 top-14 z-30 h-0.5 bg-transparent">
      <div className="h-full origin-left bg-gradient-to-r from-primary to-accent" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

/** "On this page" for long articles: collects the article's h2s (adds ids if missing). Shown for ≥ 4 sections. */
export function TableOfContents({ containerId }: { containerId: string }) {
  const [items, setItems] = useState<Array<{ id: string; text: string }>>([]);
  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root) return;
    const hs = [...root.querySelectorAll("h2")];
    setItems(
      hs.map((h, i) => {
        if (!h.id) h.id = `${slugify(h.textContent ?? "") || "section"}-${i}`;
        h.classList.add("scroll-mt-20");
        return { id: h.id, text: h.textContent ?? "" };
      }),
    );
  }, [containerId]);
  if (items.length < 4) return null;
  return (
    <details className="surface group rounded-2xl [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-semibold">
        <span className="inline-flex items-center gap-2"><ListTree className="h-4 w-4 text-positive" aria-hidden /> On this page</span>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 ease-out group-open:rotate-180" aria-hidden />
      </summary>
      <nav aria-label="On this page" className="border-t px-2 py-2">
        <ol className="space-y-0.5">
          {items.map((i, n) => (
            <li key={i.id}>
              <a href={`#${i.id}`} className="flex min-h-10 items-center gap-3 rounded-xl px-2 text-sm text-foreground/85 hover:bg-secondary">
                <span className="w-5 text-right text-caption tabular-nums text-muted-foreground">{n + 1}</span>
                {i.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
