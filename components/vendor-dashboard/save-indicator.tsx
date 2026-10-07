import { Check, CloudOff, Loader2 } from "lucide-react";

import type { SaveState } from "@/components/vendor-dashboard/use-autosave";

export function SaveIndicator({ state, error }: { state: SaveState; error?: string | null }) {
  if (state === "idle") return <span className="text-xs text-muted-foreground">Changes save automatically</span>;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-positive" aria-live="polite">
        <Check className="h-3 w-3" aria-hidden /> Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-destructive" role="alert">
      <CloudOff className="h-3 w-3" aria-hidden /> {error ?? "Not saved"}
    </span>
  );
}
