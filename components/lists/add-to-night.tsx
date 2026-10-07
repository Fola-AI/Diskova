"use client";

import { ListPlus } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { hasAuthCookie } from "@/lib/client/auth-cookie";
import { cn } from "@/lib/utils";

const AddToNightSheet = dynamic(() => import("@/components/lists/add-to-night-sheet").then((m) => m.AddToNightSheet), { ssr: false });

export interface AddTarget { vendorId?: string; eventId?: string; cityId?: string | null; name: string }

/** "Add to my night" (PRD P2). Visitors are sent to sign in; the sheet loads only when opened. */
export function AddToNight({ target, compact = false, className }: { target: AddTarget; compact?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasAuthCookie()) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }
    setOpen(true);
  };
  return (
    <>
      {compact ? (
        <button type="button" onClick={onClick} aria-label={`Add ${target.name} to my night`} data-testid="add-to-night"
          className={cn("grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80", className)}>
          <ListPlus className="h-4 w-4" aria-hidden />
        </button>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={onClick} data-testid="add-to-night" className={className}>
          <ListPlus aria-hidden /> Add to my night
        </Button>
      )}
      {open ? <AddToNightSheet target={target} open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}
