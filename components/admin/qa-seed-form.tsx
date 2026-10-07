"use client";

import { useActionState } from "react";

import { createSeedForm } from "@/app/admin/(secure)/qa/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Pinned "seed" Q&A written by staff (optionally with an official, accepted answer). */
export function QaSeedForm({ cities }: { cities: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState(createSeedForm, initialFormState);
  return (
    <form action={action} className="space-y-2" key={state.ok ? state.message : "seed"} data-testid="qa-seed-form">
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <select name="cityId" aria-label="City" className="h-9 rounded-md border bg-background px-2 text-sm" required>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input name="vendorId" placeholder="Venue id (optional — leave empty for a city question)" aria-label="Venue id" className="h-9 flex-1" />
      </div>
      <Input name="title" placeholder="Question, e.g. How do I get around safely at night?" aria-label="Question" required minLength={10} maxLength={140} />
      <Textarea name="body" rows={2} placeholder="Details (optional)" aria-label="Details" />
      <Textarea name="answer" rows={3} placeholder="Official answer (optional, shown as accepted)" aria-label="Official answer" />
      <SubmitButton size="sm">Create pinned question</SubmitButton>
    </form>
  );
}
