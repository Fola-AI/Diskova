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
    <form action={formAction} className="space-y-2">
      <input type="hidden" name={idName} value={idValue} />
      <FormAlert state={state} />
      <Input name="reason" placeholder="Reason (required to reject; sent to the vendor)" aria-label="Reason" />
      <div className="flex gap-2">
        <SubmitButton name="decision" value="approve" size="sm">{approveLabel}</SubmitButton>
        <SubmitButton name="decision" value="reject" size="sm" variant="destructive">Reject</SubmitButton>
      </div>
    </form>
  );
}
