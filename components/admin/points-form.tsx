"use client";

import { useActionState } from "react";

import { pointsForm } from "@/app/admin/(secure)/points/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { nativeSelectClass } from "@/components/ui/select";

const control = `${nativeSelectClass} w-auto min-w-[9rem] pr-9`;

export function PointsForm({ badges }: { badges: string[] }) {
  const [state, action] = useActionState(pointsForm, initialFormState);
  return (
    <form action={action} className="space-y-3" data-testid="points-form">
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <Input name="username" placeholder="username" aria-label="Username" className="w-40" required />
        <Input name="points" type="number" inputMode="numeric" placeholder="± points" aria-label="Points" className="w-28 tabular-nums" />
        <select name="badge" defaultValue="" aria-label="Badge" className={control}>
          <option value="">Badge…</option>
          {badges.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <Input name="reason" placeholder="Reason (required, audited)" aria-label="Reason" required minLength={5} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="action" value="adjust" size="sm">Adjust points</SubmitButton>
        <SubmitButton name="action" value="reset" size="sm" variant="destructive">Reset to 0</SubmitButton>
        <SubmitButton name="action" value="grant_badge" size="sm" variant="secondary">Grant badge</SubmitButton>
        <SubmitButton name="action" value="revoke_badge" size="sm" variant="secondary">Revoke badge</SubmitButton>
      </div>
      <p className="text-footnote text-muted-foreground">Reset to 0 wipes the user&apos;s points balance immediately. Every change is recorded in the audit log.</p>
    </form>
  );
}
