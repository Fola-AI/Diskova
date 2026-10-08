"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Bottom sheet on phones, centred dialog on larger screens (Radix Dialog → focus trap, Esc, aria).
 *
 * Motion (docs/ux-audit.md G6): slides up with a soft spring; the grabber/header can be dragged down
 * 1:1 with the finger, rubber-bands upwards, and dismisses past 30% of its height or on a flick
 * (> 0.5 px/ms) — the exit animation continues from where the finger let go.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  title: string;
  description?: string;
  /** Pinned under the scrolling body (primary action). Clears the home indicator. */
  footer?: React.ReactNode;
};

function useDragToDismiss(contentRef: React.RefObject<HTMLDivElement | null>, closeRef: React.RefObject<HTMLButtonElement | null>) {
  const drag = React.useRef<{ y: number; t: number; dy: number; v: number; id: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || window.matchMedia("(min-width: 640px)").matches) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    drag.current = { y: e.clientY, t: e.timeStamp, dy: 0, v: 0, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = contentRef.current;
    if (el) el.style.transition = "none";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = contentRef.current;
    if (!d || !el || e.pointerId !== d.id) return;
    const raw = e.clientY - d.y;
    const dy = raw < 0 ? raw * 0.25 : raw; // soft boundary above the resting position
    const dt = Math.max(1, e.timeStamp - d.t);
    d.v = (dy - d.dy) / dt;
    d.dy = dy;
    d.t = e.timeStamp;
    el.style.transform = `translate3d(0, ${dy}px, 0)`;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = contentRef.current;
    drag.current = null;
    if (!d || !el) return;
    e.currentTarget.releasePointerCapture?.(d.id);
    const shouldClose = d.dy > el.offsetHeight * 0.3 || (d.v > 0.5 && d.dy > 24);
    if (shouldClose) {
      // Hand the current offset to the exit keyframes so the sheet keeps travelling from the finger.
      el.style.setProperty("--sheet-from", `${d.dy}px`);
      const remaining = el.offsetHeight - d.dy;
      const ms = Math.round(Math.min(320, Math.max(160, remaining / Math.max(d.v, 0.8))));
      el.style.animationDuration = `${ms}ms`;
      el.style.transform = "";
      el.style.transition = "";
      closeRef.current?.click();
      return;
    }
    el.style.transition = "transform 280ms var(--ease-spring)";
    el.style.transform = "translate3d(0, 0, 0)";
    const clear = () => {
      el.style.transition = "";
      el.style.transform = "";
      el.removeEventListener("transitionend", clear);
    };
    el.addEventListener("transitionend", clear);
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };
}

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ className, children, title, description, footer, ...props }, forwardedRef) => {
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const closeRef = React.useRef<HTMLButtonElement | null>(null);
    const dragHandlers = useDragToDismiss(contentRef, closeRef);
    const setRefs = (node: HTMLDivElement | null) => {
      contentRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sheet-overlay fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          ref={setRefs}
          className={cn(
            "sheet-content fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-[28px] border border-b-0 bg-background shadow-[0_-12px_48px_-12px_hsl(0_0%_0%/0.6)] outline-none",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85dvh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border-b",
            className,
          )}
          {...props}
        >
          <div className="shrink-0 touch-none select-none px-5 pt-2.5 sm:pt-5" {...dragHandlers}>
            <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-muted-foreground/35 sm:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-3 pb-3">
              <div className="min-w-0 pt-1">
                <DialogPrimitive.Title className="font-display text-title font-semibold">{title}</DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
                ) : (
                  <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close
                ref={closeRef}
                className="pressable -mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary">
                  <X className="h-4 w-4" aria-hidden />
                </span>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5", footer ? "pb-4" : "pb-[max(1.25rem,env(safe-area-inset-bottom))]")}>
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t bg-background/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:rounded-b-3xl">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);
SheetContent.displayName = "SheetContent";

export { Sheet, SheetTrigger, SheetClose, SheetContent };
