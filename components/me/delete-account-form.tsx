"use client";

import { useActionState } from "react";

import { deleteAccount } from "@/app/(user)/me/settings/actions";
import { FieldError, FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action] = useActionState(deleteAccount, initialFormState);
  return (
    <form action={action} className="space-y-3" noValidate>
      <FormAlert state={state} />
      <p className="text-sm text-muted-foreground">
        This removes your profile details and hides your posts straight away. Your photos are deleted within 24 hours.
        This can&apos;t be undone.
      </p>
      <div className="space-y-2">
        <Label htmlFor="confirm">
          Type <span className="font-mono text-foreground">{username}</span> to confirm
        </Label>
        <Input id="confirm" name="confirm" autoComplete="off" aria-invalid={Boolean(state.fieldErrors?.confirm)} />
        <FieldError errors={state.fieldErrors?.confirm} />
      </div>
      <SubmitButton variant="destructive" pendingText="Deleting…">Delete my account</SubmitButton>
    </form>
  );
}
