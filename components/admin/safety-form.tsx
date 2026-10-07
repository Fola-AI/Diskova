"use client";

import { useActionState } from "react";

import { saveSafetyForm } from "@/app/admin/(secure)/safety/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SECTIONS = ["emergency_numbers", "hospitals", "police_stations", "embassies", "travel_advice", "area_notes", "scam_awareness"] as const;
const control = "h-9 rounded-md border bg-background px-2 text-sm";

export interface SafetyValues { id?: string; city_id: string | null; section: string; title: string; body_md: string; sort_order: number }

export function SafetyForm({ v, cities }: { v: SafetyValues; cities: Array<{ id: string; name: string }> }) {
  const [state, action] = useActionState(saveSafetyForm, initialFormState);
  if (state.ok && state.message === "Deleted.") return <FormAlert state={state} />;
  return (
    <form action={action} className="space-y-2 text-sm" data-testid="safety-form">
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
        <Input name="sort_order" type="number" defaultValue={v.sort_order} aria-label="Sort order" className="h-9 w-20" />
      </div>
      <Input name="title" defaultValue={v.title} placeholder="Title" aria-label="Title" required className="h-9" />
      <Textarea name="body_md" defaultValue={v.body_md} rows={4} aria-label="Body" placeholder="Markdown. Only verified information — include phone numbers exactly as published by the source." />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5"><input type="checkbox" name="mark_verified" className="h-4 w-4" /> I checked this against the official source today</label>
        <Input name="reason" placeholder="Source / reason" aria-label="Reason" className="h-9 flex-1" />
      </div>
      <div className="flex gap-2">
        <SubmitButton name="action" value="save" size="sm">{v.id ? "Save" : "Add entry"}</SubmitButton>
        {v.id ? <SubmitButton name="action" value="delete" size="sm" variant="destructive">Delete</SubmitButton> : null}
      </div>
    </form>
  );
}
