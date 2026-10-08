"use client";

import { useActionState } from "react";

import { updateIssueAction } from "@/app/admin/(secure)/issues/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { nativeSelectClass } from "@/components/ui/select";

export function IssueForm({ id, status }: { id: string; status: string }) {
  const [state, action] = useActionState(updateIssueAction, initialFormState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={status} aria-label="Status" className={`${nativeSelectClass} w-auto min-w-[8rem] pr-9`}>
        {["new", "triaged", "escalated", "closed"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Input name="note" placeholder="Internal note" aria-label="Internal note" className="min-w-[10rem] flex-1 sm:max-w-xs" />
      <SubmitButton variant="secondary">Save</SubmitButton>
      <FormAlert state={state} className="basis-full" />
    </form>
  );
}
