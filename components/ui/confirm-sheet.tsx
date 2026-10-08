"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/** In-app confirmation for irreversible actions only (never for reversible ones — use Undo instead). */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending = false,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  children?: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={title} description={description}>
        <div className="space-y-4">
          {children}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="destructive" size="lg" loading={pending} onClick={onConfirm}>{confirmLabel}</Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
