"use client";

import { useActionState } from "react";

import { changeRoleForm } from "@/app/admin/(secure)/users/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { nativeSelectClass } from "@/components/ui/select";
import { USER_ROLES, type UserRole } from "@/lib/auth/roles";

export function RoleForm({ userId, role }: { userId: string; role: UserRole }) {
  const [state, action] = useActionState(changeRoleForm, initialFormState);
  return (
    <form action={action} className="space-y-3" data-testid="role-form">
      <input type="hidden" name="userId" value={userId} />
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <select name="role" defaultValue={role} aria-label="Role" className={`${nativeSelectClass} w-auto min-w-[9rem] pr-9`}>
          {USER_ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
        <Input name="reason" placeholder="Reason (required)" aria-label="Reason" className="min-w-[12rem] flex-1" required minLength={5} />
      </div>
      <SubmitButton variant="secondary" pendingText="Changing role…">Change role</SubmitButton>
      <p className="text-footnote text-muted-foreground">Asks for a fresh authenticator code if your last one is older than 5 minutes. The user is signed out everywhere.</p>
    </form>
  );
}
