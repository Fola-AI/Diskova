"use client";

import { useActionState } from "react";

import { updatePassword } from "@/app/(auth)/actions";
import { PasswordField } from "@/components/auth/fields";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, initialFormState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <PasswordField label="New password" autoComplete="new-password" serverErrors={state.fieldErrors?.password} checklist />
      <PasswordField id="confirm" name="confirm" label="Confirm new password" autoComplete="new-password" serverErrors={state.fieldErrors?.confirm} />
      <SubmitButton className="w-full" size="lg" pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
