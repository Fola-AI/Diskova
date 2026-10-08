"use client";

import { Flag } from "lucide-react";
import { useState } from "react";

import { reportAction } from "@/app/actions/posts";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS } from "@/lib/validation/constants";
import { trackEvent } from "@/lib/analytics";

export function ReportButton({
  entityType,
  entityId,
  label = "Report",
  presetReason,
  title = "Report this",
}: {
  entityType: "post" | "vendor" | "event" | "profile" | "qa_question" | "qa_answer";
  entityId: string;
  label?: string;
  /** Vendor disputes: "wrong_venue" pre-selected (a report from venue staff becomes a P2 vendor dispute). */
  presetReason?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(presetReason ?? "");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ error?: string; message?: string }>({});

  async function submit() {
    setBusy(true);
    const res = await reportAction({ entityType, entityId, reason, details });
    setBusy(false);
    if (!res.ok) {
      if (res.needsLogin) window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return setState({ error: res.error });
    }
    trackEvent("report_submitted", { entity: entityType });
    setState({ message: "Thanks — our team reviews every report." });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setState({}); }}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
          <Flag aria-hidden /> {label}
        </Button>
      </SheetTrigger>
      <SheetContent title={title} description="Tell us what's wrong. Reports are private.">
        {state.message ? (
          <FormAlert state={state} />
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="sr-only">Reason</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.value} className={`pressable-soft flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${reason === r.value ? "border-positive bg-primary/10" : "bg-secondary/30 hover:border-muted-foreground/40"}`}>
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="h-5 w-5" />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <Textarea aria-label="Details (optional)" placeholder="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} />
            {state.error ? <FormAlert state={state} /> : null}
            <Button type="button" className="w-full" size="lg" disabled={!reason} loading={busy} onClick={submit}>{busy ? "Sending…" : "Send report"}</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
