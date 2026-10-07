"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitForReviewAction } from "@/app/(vendor)/vendor/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { StepFooter } from "@/components/vendor-dashboard/step-footer";
import { trackEvent } from "@/lib/analytics";

export function ReviewStep({
  vendorId,
  completeness,
  missing,
  suggestions,
  status,
  backHref,
}: {
  vendorId: string;
  completeness: number;
  missing: string[];
  suggestions: string[];
  status: string;
  backHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = missing.length === 0 && ["draft", "rejected"].includes(status);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await submitForReviewAction(vendorId);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    trackEvent("vendor_submitted");
    router.push("/vendor?submitted=1");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Profile completeness</span>
          <span className="font-semibold">{completeness}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-primary transition-all" style={{ width: `${completeness}%` }} />
        </div>
      </div>
      {missing.length ? (
        <div className="space-y-1 rounded-lg border border-destructive/40 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium"><CircleAlert className="h-4 w-4 text-destructive" aria-hidden /> Needed before you can submit</p>
          <ul className="ml-6 list-disc text-muted-foreground">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-positive" aria-hidden /> Ready to submit.</p>
      )}
      {suggestions.length ? (
        <div className="text-sm">
          <p className="font-medium">To stand out (optional)</p>
          <ul className="ml-5 list-disc text-muted-foreground">{suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      ) : null}
      {error ? <FormAlert state={{ error }} /> : null}
      {status === "pending_review" ? (
        <FormAlert state={{ message: "Submitted — our team is reviewing your listing." }} />
      ) : (
        <Button type="button" className="w-full" size="lg" disabled={!canSubmit || busy} onClick={submit}>
          {busy ? "Submitting…" : status === "rejected" ? "Resubmit for review" : "Submit for review"}
        </Button>
      )}
      <StepFooter backHref={backHref} />
    </div>
  );
}
