"use client";

import { useActionState } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

export interface ActionChoice {
  value: string;
  label: string;
  destructive?: boolean;
}

/**
 * Generic admin action form: one reason box + one button per action. The server decides which
 * actions need a reason (all destructive ones do) — this only collects it.
 */
export function ActionForm({
  action,
  hidden,
  choices,
  reasonPlaceholder = "Reason (required for destructive actions)",
  withDays = false,
  formId,
  testId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  hidden?: Record<string, string>;
  choices: ActionChoice[];
  reasonPlaceholder?: string;
  withDays?: boolean;
  formId?: string;
  testId?: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const hasDestructive = choices.some((c) => c.destructive);
  return (
    <form id={formId} action={formAction} className="space-y-3" data-testid={testId}>
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <Input name="reason" placeholder={reasonPlaceholder} aria-label="Reason" className="min-w-[12rem] flex-1" />
        {withDays ? <Input name="days" type="number" inputMode="numeric" min={1} max={365} placeholder="Days" aria-label="Days" className="w-24 tabular-nums" /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {choices.map((c) => (
          <SubmitButton key={c.value} name="action" value={c.value} size="sm" variant={c.destructive ? "destructive" : "secondary"}>
            {c.label}
          </SubmitButton>
        ))}
      </div>
      {hasDestructive ? (
        <p className="text-footnote text-muted-foreground">Red actions take effect immediately, need a reason and are recorded in the audit log.</p>
      ) : null}
    </form>
  );
}
