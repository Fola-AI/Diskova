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
    <form action={action} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <FormAlert state={state} />
      <Input name="reason" placeholder="Reason (required to reject or cancel)" aria-label="Reason" />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {mode === "pending" ? (
          <>
            <SubmitButton name="decision" value="approve">Approve</SubmitButton>
            <SubmitButton name="decision" value="reject" variant="destructive">Reject</SubmitButton>
          </>
        ) : (
          <>
            <SubmitButton name="decision" value={featured ? "unfeature" : "feature"} variant="secondary">{featured ? "Unfeature" : "Feature"}</SubmitButton>
            <SubmitButton name="decision" value="cancel" variant="destructive">Mark cancelled</SubmitButton>
          </>
        )}
      </div>
      <p className="text-footnote text-muted-foreground">
        {mode === "pending" ? "Rejecting keeps the event off the public calendar." : "Marking cancelled shows the event as cancelled to everyone."}
      </p>
    </form>
  );
}
