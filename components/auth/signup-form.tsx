"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signUp } from "@/app/(auth)/actions";
import { FieldError, FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [state, action] = useActionState(signUp, initialFormState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required
          aria-invalid={Boolean(state.fieldErrors?.email)} aria-describedby="email-error" />
        <FieldError id="email-error" errors={state.fieldErrors?.email} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8}
          aria-invalid={Boolean(state.fieldErrors?.password)} aria-describedby="password-help" />
        <p id="password-help" className="text-xs text-muted-foreground">
          At least 8 characters, with an uppercase letter, a lowercase letter and a number.
        </p>
        <FieldError errors={state.fieldErrors?.password} />
      </div>
      <div className="space-y-1">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms" className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" required />
          <span className="text-muted-foreground">
            I agree to the{" "}
            <Link href="/terms" className="text-foreground underline underline-offset-4">Terms</Link> and{" "}
            <Link href="/privacy" className="text-foreground underline underline-offset-4">Privacy Policy</Link>.
          </span>
        </label>
        <FieldError errors={state.fieldErrors?.terms} />
      </div>
      <SubmitButton className="w-full" pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
