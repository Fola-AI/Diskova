"use client";

import { useActionState } from "react";

import { addNoteAction } from "@/app/admin/(secure)/vendors/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Textarea } from "@/components/ui/textarea";

/** Append-only staff note on any entity (stored in the audit log as `note.added`). */
export function NoteForm({ entityType, entityId, back }: { entityType: string; entityId: string; back: string }) {
  const [state, action] = useActionState(addNoteAction, initialFormState);
  return (
    <form action={action} className="space-y-3" key={state.ok ? String(Date.now()) : "note"}>
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="back" value={back} />
      <FormAlert state={state} />
      <Textarea name="note" rows={2} placeholder="Add an internal note" aria-label="Internal note" required minLength={2} maxLength={2000} />
      <SubmitButton variant="secondary" pendingText="Adding…">Add note</SubmitButton>
    </form>
  );
}
