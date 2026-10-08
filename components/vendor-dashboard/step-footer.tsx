"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function StepFooter({
  backHref,
  nextHref,
  beforeNext,
  status,
  nextLabel = "Next",
}: {
  backHref?: string | null;
  nextHref?: string | null;
  beforeNext?: () => Promise<boolean>;
  status?: ReactNode;
  nextLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="sticky bottom-[var(--tabbar-h)] z-20 -mx-4 flex items-center justify-between gap-2 border-t border-border/70 bg-background/85 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-3">
        {backHref ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={backHref}><ArrowLeft aria-hidden /> Back</Link>
          </Button>
        ) : null}
        {status}
      </div>
      {nextHref ? (
        <Button
          type="button"
          loading={busy}
          className="min-w-28"
          onClick={async () => {
            setBusy(true);
            const ok = beforeNext ? await beforeNext() : true;
            setBusy(false);
            if (ok) router.push(nextHref);
          }}
        >
          {nextLabel} {busy ? null : <ArrowRight aria-hidden />}
        </Button>
      ) : null}
    </div>
  );
}
