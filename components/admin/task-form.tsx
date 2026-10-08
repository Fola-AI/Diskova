"use client";

import { useActionState } from "react";

import { createTaskForm } from "@/app/admin/(secure)/tasks/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { nativeSelectClass } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const control = `${nativeSelectClass} w-auto pr-9`;

export function TaskForm({ staff, preset }: { staff: Array<{ id: string; username: string }>; preset?: { title?: string; entityType?: string; entityId?: string } }) {
  const [state, action] = useActionState(createTaskForm, initialFormState);
  return (
    <form action={action} className="space-y-3" key={state.ok ? state.message : "new"}>
      <FormAlert state={state} />
      {preset?.entityType ? <input type="hidden" name="related_entity_type" value={preset.entityType} /> : null}
      {preset?.entityId ? <input type="hidden" name="related_entity_id" value={preset.entityId} /> : null}
      <div className="flex flex-wrap gap-2">
        <Input name="title" defaultValue={preset?.title ?? ""} placeholder="Task title" aria-label="Title" className="min-w-[14rem] flex-1" required minLength={3} />
        <select name="priority" defaultValue="normal" aria-label="Priority" className={control}>
          {["low", "normal", "high", "urgent"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <select name="assigned_to" defaultValue="" aria-label="Assignee" className={control}>
          <option value="">Unassigned</option>
          {staff.map((s) => <option key={s.id} value={s.id}>@{s.username}</option>)}
        </select>
        <Input type="date" name="due_at" aria-label="Due date" className="w-auto" />
      </div>
      <Textarea name="description" rows={2} placeholder="Details (optional)" aria-label="Details" />
      <SubmitButton pendingText="Adding…">Add task</SubmitButton>
    </form>
  );
}
