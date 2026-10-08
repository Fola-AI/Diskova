"use client";

import { useActionState, useEffect, useState } from "react";

import type { FormState } from "@/components/forms/form-state";
import { EmailField } from "@/components/auth/fields";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";

const COOLDOWN_S = 60;

/**
 * Single-email form used for resend-verification and password-reset requests.
 * After a successful send the button waits 60 s (with a visible countdown) so people don't
 * hammer the mail provider while the first email is still on its way.
 */
export function EmailLinkForm({
  action,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (!state.message) return;
    setWait(COOLDOWN_S);
    const id = setInterval(() => setWait((w) => (w <= 1 ? (clearInterval(id), 0) : w - 1)), 1000);
    return () => clearInterval(id);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <EmailField serverErrors={state.fieldErrors?.email} />
      <SubmitButton className="w-full" size="lg" variant="secondary" pendingText="Sending…" disabled={wait > 0}>
        {wait > 0 ? `Send again in ${wait}s` : submitLabel}
      </SubmitButton>
    </form>
  );
}
