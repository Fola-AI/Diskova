"use client";

import { useEffect, useState } from "react";

/**
 * §11.3 keyboard shortcuts for the moderation queue:
 * A approve · R remove (asks for a reason first) · S skip to next item · N focus the note/reason box.
 * Ignored while typing in a field (except Escape, which returns focus to the queue).
 */
const kbd = "inline-grid h-6 min-w-6 place-items-center rounded-md border border-b-2 bg-secondary px-1.5 font-mono text-caption text-foreground";

export function ModerationShortcuts() {
  const [index, setIndex] = useState(0);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const items = () => Array.from(document.querySelectorAll<HTMLElement>("[data-testid='moderation-item']"));
    const mark = (i: number) => {
      items().forEach((el, j) => el.toggleAttribute("data-current", j === i));
      items()[i]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    mark(index);

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing) {
        if (e.key === "Escape") target.blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const list = items();
      const current = list[Math.min(index, list.length - 1)];
      if (!current) return;
      const reason = current.querySelector<HTMLInputElement>("input[name='reason']");
      const click = (value: string) => current.querySelector<HTMLButtonElement>(`button[name='action'][value='${value}']`)?.click();
      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          click("approve");
          setHint("Approved");
          break;
        case "r":
          e.preventDefault();
          if (!reason?.value.trim()) {
            reason?.focus();
            setHint("Type a reason, then press Enter on Remove (or Esc then R)");
          } else {
            click("remove");
            setHint("Removed");
          }
          break;
        case "s":
          e.preventDefault();
          setIndex((i) => Math.min(i + 1, list.length - 1));
          setHint("Skipped");
          break;
        case "n":
          e.preventDefault();
          reason?.focus();
          break;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index]);

  return (
    <p className="hidden flex-wrap items-center gap-x-2 gap-y-1 text-footnote text-muted-foreground md:flex" aria-live="polite" data-testid="moderation-shortcuts">
      <span className="text-caption font-semibold uppercase tracking-[0.06em]">Shortcuts</span>
      <span><kbd className={kbd}>A</kbd> approve</span>
      <span><kbd className={kbd}>R</kbd> remove</span>
      <span><kbd className={kbd}>S</kbd> skip</span>
      <span><kbd className={kbd}>N</kbd> note</span>
      {hint ? <span className="font-semibold text-foreground">— {hint}</span> : null}
    </p>
  );
}
