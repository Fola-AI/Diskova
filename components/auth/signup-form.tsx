"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUp } from "@/app/(auth)/actions";
import { EmailField, PasswordField } from "@/components/auth/fields";
import { FieldError, FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";

export function SignupForm() {
  const [state, action] = useActionState(signUp, initialFormState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <EmailField serverErrors={state.fieldErrors?.email} />
      <PasswordField autoComplete="new-password" serverErrors={state.fieldErrors?.password} checklist />
      <div className="space-y-1.5">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl py-1 text-sm">
          <input type="checkbox" name="terms" className="mt-0.5 h-5 w-5 shrink-0" required aria-invalid={Boolean(state.fieldErrors?.terms) || undefined} />
          <span className="text-muted-foreground">
            I agree to the{" "}
            <Link href="/terms" className="text-foreground underline underline-offset-4">Terms</Link> and{" "}
            <Link href="/privacy" className="text-foreground underline underline-offset-4">Privacy Policy</Link>.
          </span>
        </label>
        <FieldError errors={state.fieldErrors?.terms} />
      </div>
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
