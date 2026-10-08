"use client";

import { Check, ChevronDown, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { chipClass } from "@/components/ui/chip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** "All cities ▾" chip that opens a sheet of cities (56px rows) — one chip instead of a second row. */
export function CityPicker({ current, options }: { current: string | null; options: Array<{ label: string; href: string; value: string | null }> }) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === current)?.label ?? "All cities";
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={chipClass(Boolean(current))} aria-label={`City: ${label}. Change city`}>
          <MapPin className="h-4 w-4" aria-hidden />
          {label}
          <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent title="Choose a city">
        <ul className="surface divide-y overflow-hidden rounded-2xl">
          {options.map((o) => {
            const on = o.value === current;
            return (
              <li key={o.label}>
                <Link
                  href={o.href}
                  scroll={false}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className={cn("flex min-h-14 items-center justify-between px-4 text-[15px] transition-colors hover:bg-secondary/60 active:bg-secondary", on && "font-semibold text-positive")}
                >
                  {o.label}
                  {on ? <Check className="h-5 w-5" aria-hidden /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
