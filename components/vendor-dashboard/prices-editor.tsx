"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { savePricesAction } from "@/app/(vendor)/vendor/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveIndicator } from "@/components/vendor-dashboard/save-indicator";
import { StepFooter } from "@/components/vendor-dashboard/step-footer";
import type { SaveState } from "@/components/vendor-dashboard/use-autosave";

export interface PriceValue {
  id?: string;
  label: string;
  amount_ngn: string;
  note: string;
}

export function PricesEditor({
  vendorId,
  initial,
  backHref,
  nextHref,
}: {
  vendorId: string;
  initial: PriceValue[];
  backHref?: string;
  nextHref?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<PriceValue[]>(initial.length ? initial : [{ label: "", amount_ngn: "", note: "" }]);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<boolean> {
    const filled = rows.filter((r) => r.label.trim() || r.amount_ngn.trim());
    setState("saving");
    const res = await savePricesAction(
      vendorId,
      filled.map((r) => ({ id: r.id, label: r.label, amount_ngn: r.amount_ngn.replace(/[₦,\s]/g, ""), note: r.note })),
    );
    if (!res.ok) {
      setState("error");
      setError(res.error);
      return false;
    }
    setState("saved");
    setError(null);
    router.refresh();
    return true;
  }

  const update = (i: number, patch: Partial<PriceValue>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const listRef = useRef<HTMLUListElement | null>(null);
  const [focusLast, setFocusLast] = useState(false);
  useEffect(() => {
    if (!focusLast) return;
    listRef.current?.querySelector<HTMLInputElement>("li:last-child input")?.focus();
    setFocusLast(false);
  }, [focusLast, rows.length]);
  const remove = (i: number) => {
    const removed = rows[i]!;
    setRows((rs) => rs.filter((_, j) => j !== i));
    if (!removed.label && !removed.amount_ngn) return;
    toast(`Removed ${removed.label || "price"}`, {
      description: "Not saved yet — tap Save prices to keep the change.",
      action: { label: "Undo", onClick: () => setRows((rs) => [...rs.slice(0, i), removed, ...rs.slice(i)]) },
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Honest prices are one of the most-viewed things on a venue page. Use 0 for free.</p>
      {error ? <FormAlert state={{ error }} /> : null}
      <ul ref={listRef} className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.id ?? `new-${i}`} className="surface enter-up space-y-2.5 rounded-2xl p-3.5">
            <fieldset className="space-y-2.5">
              <legend className="sr-only">Price {i + 1}</legend>
              <div className="flex gap-2">
                <Input aria-label="Item" placeholder="e.g. Entry (Fri & Sat)" value={r.label} maxLength={80} onChange={(e) => update(i, { label: e.target.value })} />
                <span className="relative w-36 shrink-0">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>₦</span>
                  <Input aria-label="Price in naira" placeholder="0" inputMode="numeric" className="pl-8 tabular-nums" value={r.amount_ngn}
                    onChange={(e) => update(i, { amount_ngn: e.target.value })}
                    onBlur={() => {
                      const n = Number(r.amount_ngn.replace(/[₦,\s]/g, ""));
                      if (r.amount_ngn.trim() && Number.isFinite(n)) update(i, { amount_ngn: n.toLocaleString("en-NG") });
                    }} />
                </span>
              </div>
              <div className="flex gap-2">
                <Input aria-label="Note" placeholder="Note (optional), e.g. free before midnight" value={r.note} maxLength={200} onChange={(e) => update(i, { note: e.target.value })} />
                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Remove ${r.label || `price ${i + 1}`}`} onClick={() => remove(i)}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => { setRows((rs) => [...rs, { label: "", amount_ngn: "", note: "" }]); setFocusLast(true); }} disabled={rows.length >= 30}>
        <Plus aria-hidden /> Add price
      </Button>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={save} loading={state === "saving"}>Save prices</Button>
        <SaveIndicator state={state} error={error} />
      </div>
      {nextHref ? <StepFooter backHref={backHref} nextHref={nextHref} beforeNext={save} /> : null}
    </div>
  );
}
