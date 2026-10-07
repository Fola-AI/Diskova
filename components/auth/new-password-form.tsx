"use client";

import { useActionState } from "react";

import { updatePassword } from "@/app/(auth)/actions";
import { FieldError, FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, initialFormState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required
          aria-invalid={Boolean(state.fieldErrors?.password)} />
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required
          aria-invalid={Boolean(state.fieldErrors?.confirm)} />
        <FieldError errors={state.fieldErrors?.confirm} />
      </div>
      <SubmitButton className="w-full" pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
