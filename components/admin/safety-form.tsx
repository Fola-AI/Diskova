"use client";

import { useActionState } from "react";

import { saveSafetyForm } from "@/app/admin/(secure)/safety/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { nativeSelectClass } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SECTIONS = ["emergency_numbers", "hospitals", "police_stations", "embassies", "travel_advice", "area_notes", "scam_awareness"] as const;
const control = `${nativeSelectClass} w-auto min-w-[9rem] pr-9`;

export interface SafetyValues { id?: string; city_id: string | null; section: string; title: string; body_md: string; sort_order: number }

export function SafetyForm({ v, cities }: { v: SafetyValues; cities: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState(saveSafetyForm, initialFormState);
  if (state.ok && state.message === "Deleted.") return <FormAlert state={state} />;
  return (
    <form action={action} className="space-y-3 text-sm" data-testid="safety-form">
      {v.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <select name="section" defaultValue={v.section} aria-label="Section" className={control}>
          {SECTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select name="city_id" defaultValue={v.city_id ?? ""} aria-label="City" className={control}>
          <option value="">National</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input name="sort_order" type="number" defaultValue={v.sort_order} inputMode="numeric" aria-label="Sort order" className="w-24 tabular-nums" />
      </div>
      <Input name="title" defaultValue={v.title} placeholder="Title" aria-label="Title" required />
      <Textarea name="body_md" defaultValue={v.body_md} rows={4} aria-label="Body" placeholder="Markdown. Only verified information — include phone numbers exactly as published by the source." />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-secondary/40 px-3.5 py-2 font-medium has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"><input type="checkbox" name="mark_verified" className="h-4 w-4 shrink-0 accent-primary" /> I checked this against the official source today</label>
        <Input name="reason" placeholder="Source / reason" aria-label="Reason" className="min-w-[12rem] flex-1" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton name="action" value="save" size="sm">{v.id ? "Save" : "Add entry"}</SubmitButton>
        {v.id ? <SubmitButton name="action" value="delete" size="sm" variant="destructive">Delete</SubmitButton> : null}
        {v.id ? <span className="text-footnote text-muted-foreground">Delete removes this entry from the public safety page.</span> : null}
      </div>
    </form>
  );
}
