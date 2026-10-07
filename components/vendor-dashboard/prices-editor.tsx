"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Honest prices are one of the most-viewed things on a venue page. Use 0 for free.</p>
      {error ? <FormAlert state={{ error }} /> : null}
      <ul className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.id ?? `new-${i}`} className="space-y-2 rounded-lg border p-3">
            <div className="flex gap-2">
              <Input aria-label="Item" placeholder="e.g. Entry (Fri & Sat)" value={r.label} maxLength={80} onChange={(e) => update(i, { label: e.target.value })} />
              <Input aria-label="Price in naira" placeholder="₦" inputMode="numeric" className="w-32" value={r.amount_ngn} onChange={(e) => update(i, { amount_ngn: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove price" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </Button>
            </div>
            <Input aria-label="Note" placeholder="Note (optional), e.g. free before midnight" value={r.note} maxLength={200} onChange={(e) => update(i, { note: e.target.value })} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, { label: "", amount_ngn: "", note: "" }])} disabled={rows.length >= 30}>
          <Plus aria-hidden /> Add price
        </Button>
        <Button type="button" size="sm" onClick={save}>Save prices</Button>
        <SaveIndicator state={state} error={error} />
      </div>
      {nextHref ? <StepFooter backHref={backHref} nextHref={nextHref} beforeNext={save} /> : null}
    </div>
  );
}
