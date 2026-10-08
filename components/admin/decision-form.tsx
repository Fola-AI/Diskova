"use client";

import { useActionState } from "react";

import type { FormState } from "@/components/forms/form-state";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

/** Approve / reject with a mandatory reason for rejections (§11: destructive actions need a reason). */
export function DecisionForm({
  action,
  idName,
  idValue,
  approveLabel = "Approve",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  idName: string;
  idValue: string;
  approveLabel?: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  if (state.ok) return <FormAlert state={state} />;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name={idName} value={idValue} />
      <FormAlert state={state} />
      <Input name="reason" placeholder="Reason (required to reject; sent to the vendor)" aria-label="Reason" />
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <SubmitButton name="decision" value="approve">{approveLabel}</SubmitButton>
        <SubmitButton name="decision" value="reject" variant="destructive">Reject</SubmitButton>
      </div>
      <p className="text-footnote text-muted-foreground">Rejecting sends your reason to the vendor.</p>
    </form>
  );
}
