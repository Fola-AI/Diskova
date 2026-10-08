"use client";

import { toast } from "sonner";

/**
 * Undo-able destructive action: the UI updates now, the server call runs after `ms` unless the
 * person taps Undo. If the page unloads first, the action is committed straight away.
 */
export function deferWithUndo({
  message,
  commit,
  undo,
  ms = 5000,
}: {
  message: string;
  commit: () => Promise<{ ok: boolean; error?: string }>;
  undo: () => void;
  ms?: number;
}) {
  let done = false;
  const run = async () => {
    if (done) return;
    done = true;
    window.removeEventListener("pagehide", run);
    const r = await commit();
    if (!r.ok) {
      undo();
      toast.error(r.error ?? "Something went wrong.");
    }
  };
  const timer = window.setTimeout(() => void run(), ms);
  window.addEventListener("pagehide", run);
  toast(message, {
    duration: ms,
    action: {
      label: "Undo",
      onClick: () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        window.removeEventListener("pagehide", run);
        undo();
      },
    },
  });
}
