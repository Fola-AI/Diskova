"use client";

import { useActionState } from "react";

import type { FormState } from "@/components/forms/form-state";
import { FieldError, FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Single-email form used for resend-verification and password-reset requests. */
export function EmailLinkForm({
  action,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required
          aria-invalid={Boolean(state.fieldErrors?.email)} />
        <FieldError errors={state.fieldErrors?.email} />
      </div>
      <SubmitButton className="w-full" variant="secondary" pendingText="Sending…">{submitLabel}</SubmitButton>
    </form>
  );
}
