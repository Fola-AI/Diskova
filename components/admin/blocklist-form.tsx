"use client";

import { useActionState } from "react";

import { addBlocklistPhraseAction } from "@/app/admin/(secure)/moderation/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

/** Quick "add blocklist phrase" from the queue (§11.3). Blocked phrases stop posts before AI moderation. */
export function BlocklistForm() {
  const [state, action] = useActionState(addBlocklistPhraseAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2" data-testid="blocklist-form" key={state.ok ? state.message : "b"}>
      <Input name="phrase" placeholder="Add a phrase to the blocklist" aria-label="Blocklist phrase" className="h-9 max-w-xs" required minLength={3} maxLength={100} />
      <SubmitButton size="sm" variant="outline">Add</SubmitButton>
      <FormAlert state={state} />
    </form>
  );
}
