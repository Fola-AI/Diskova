"use client";

import { useActionState } from "react";

import { moderationDecisionAction } from "@/app/admin/(secure)/moderation/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { REPORT_REASONS } from "@/lib/validation/posts";

/** Moderator actions (§11.3 subset). Removals, sanctions and shadowbans require a reason. */
export function ModerationForm({ itemId, isPost }: { itemId: string; isPost: boolean }) {
  const [state, action] = useActionState(moderationDecisionAction, initialFormState);
  if (state.ok) return <FormAlert state={state} />;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="itemId" value={itemId} />
      <FormAlert state={state} />
      <Input name="reason" placeholder="Reason (required to remove / sanction; emailed to the author)" aria-label="Reason" />
      {isPost ? (
        <select name="category" aria-label="Category" className="h-9 w-full rounded-md border bg-background px-2 text-sm" defaultValue="">
          <option value="">Category (optional)</option>
          {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {isPost ? (
          <>
            <SubmitButton name="action" value="approve" size="sm">Approve</SubmitButton>
            <SubmitButton name="action" value="approve_verify" size="sm" variant="secondary">Approve + verify</SubmitButton>
            <SubmitButton name="action" value="remove" size="sm" variant="destructive">Remove</SubmitButton>
            <SubmitButton name="action" value="remove_warn" size="sm" variant="destructive">Remove + warn</SubmitButton>
            <SubmitButton name="action" value="remove_suspend" size="sm" variant="destructive">Remove + suspend 7d</SubmitButton>
            <SubmitButton name="action" value="remove_ban" size="sm" variant="destructive">Remove + ban</SubmitButton>
            <SubmitButton name="action" value="shadowban" size="sm" variant="outline">Shadowban author</SubmitButton>
          </>
        ) : null}
        <SubmitButton name="action" value="dismiss" size="sm" variant="ghost">Dismiss</SubmitButton>
      </div>
    </form>
  );
}
