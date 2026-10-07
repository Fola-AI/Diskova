"use client";

import { useActionState } from "react";

import { pointsForm } from "@/app/admin/(secure)/points/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

const control = "h-9 rounded-md border bg-background px-2 text-sm";

export function PointsForm({ badges }: { badges: string[] }) {
  const [state, action] = useActionState(pointsForm, initialFormState);
  return (
    <form action={action} className="space-y-2" data-testid="points-form">
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <Input name="username" placeholder="username" aria-label="Username" className="h-9 w-40" required />
        <Input name="points" type="number" placeholder="± points" aria-label="Points" className="h-9 w-28" />
        <select name="badge" defaultValue="" aria-label="Badge" className={control}>
          <option value="">Badge…</option>
          {badges.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <Input name="reason" placeholder="Reason (required, audited)" aria-label="Reason" className="h-9" required minLength={5} />
      <div className="flex flex-wrap gap-1.5">
        <SubmitButton name="action" value="adjust" size="sm">Adjust points</SubmitButton>
        <SubmitButton name="action" value="reset" size="sm" variant="destructive">Reset to 0</SubmitButton>
        <SubmitButton name="action" value="grant_badge" size="sm" variant="secondary">Grant badge</SubmitButton>
        <SubmitButton name="action" value="revoke_badge" size="sm" variant="secondary">Revoke badge</SubmitButton>
      </div>
    </form>
  );
}
