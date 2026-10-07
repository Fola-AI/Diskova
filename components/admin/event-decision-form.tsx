"use client";

import { useActionState } from "react";

import { eventDecisionAction } from "@/app/admin/(secure)/events/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

export function EventDecisionForm({ eventId, mode, featured }: { eventId: string; mode: "pending" | "published"; featured?: boolean }) {
  const [state, action] = useActionState(eventDecisionAction, initialFormState);
  if (state.ok) return <FormAlert state={state} />;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      <FormAlert state={state} />
      <Input name="reason" placeholder="Reason (required to reject or cancel)" aria-label="Reason" />
      <div className="flex flex-wrap gap-1.5">
        {mode === "pending" ? (
          <>
            <SubmitButton name="decision" value="approve" size="sm">Approve</SubmitButton>
            <SubmitButton name="decision" value="reject" size="sm" variant="destructive">Reject</SubmitButton>
          </>
        ) : (
          <>
            <SubmitButton name="decision" value={featured ? "unfeature" : "feature"} size="sm" variant="secondary">{featured ? "Unfeature" : "Feature"}</SubmitButton>
            <SubmitButton name="decision" value="cancel" size="sm" variant="destructive">Mark cancelled</SubmitButton>
          </>
        )}
      </div>
    </form>
  );
}
