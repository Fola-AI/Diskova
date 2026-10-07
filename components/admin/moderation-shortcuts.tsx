"use client";

import { useEffect, useState } from "react";

/**
 * §11.3 keyboard shortcuts for the moderation queue:
 * A approve · R remove (asks for a reason first) · S skip to next item · N focus the note/reason box.
 * Ignored while typing in a field (except Escape, which returns focus to the queue).
 */
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
    <p className="text-xs text-muted-foreground" aria-live="polite" data-testid="moderation-shortcuts">
      Shortcuts: <kbd className="rounded border px-1">A</kbd> approve · <kbd className="rounded border px-1">R</kbd> remove · <kbd className="rounded border px-1">S</kbd> skip · <kbd className="rounded border px-1">N</kbd> note
      {hint ? <span className="ml-2 text-foreground">— {hint}</span> : null}
    </p>
  );
}
