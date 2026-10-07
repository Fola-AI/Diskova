"use client";

import { useActionState } from "react";

import { editEventForm } from "@/app/admin/(secure)/events/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EVENT_CATEGORIES } from "@/lib/validation/constants";

export interface EventEditValues {
  id: string; title: string; description_md: string | null; category: string; starts_local: string; ends_local: string;
  venue_name_freeform: string | null; ticket_url: string | null; is_free: boolean; price_from_ngn: number | null; price_to_ngn: number | null;
}

export function EventEditForm({ v }: { v: EventEditValues }) {
  const [state, action] = useActionState(editEventForm, initialFormState);
  const row = "grid gap-3 sm:grid-cols-2";
  return (
    <form action={action} className="space-y-3" data-testid="event-edit-form">
      <input type="hidden" name="eventId" value={v.id} />
      <FormAlert state={state} />
      <div className="space-y-1"><Label htmlFor="ee-title">Title</Label><Input id="ee-title" name="title" defaultValue={v.title} required /></div>
      <div className={row}>
        <div className="space-y-1"><Label htmlFor="ee-start">Starts (venue time)</Label><Input id="ee-start" name="starts_local" type="datetime-local" defaultValue={v.starts_local} required /></div>
        <div className="space-y-1"><Label htmlFor="ee-end">Ends</Label><Input id="ee-end" name="ends_local" type="datetime-local" defaultValue={v.ends_local} /></div>
        <div className="space-y-1">
          <Label htmlFor="ee-cat">Category</Label>
          <select id="ee-cat" name="category" defaultValue={v.category} className="h-10 w-full rounded-md border bg-background px-2 text-sm">
            {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="space-y-1"><Label htmlFor="ee-venue">Venue name</Label><Input id="ee-venue" name="venue_name_freeform" defaultValue={v.venue_name_freeform ?? ""} /></div>
        <div className="space-y-1"><Label htmlFor="ee-ticket">Ticket link</Label><Input id="ee-ticket" name="ticket_url" type="url" defaultValue={v.ticket_url ?? ""} /></div>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="is_free" defaultChecked={v.is_free} className="h-4 w-4" /> Free</label>
        <div className="space-y-1"><Label htmlFor="ee-pf">Price from (₦)</Label><Input id="ee-pf" name="price_from_ngn" type="number" min={0} defaultValue={v.price_from_ngn ?? ""} /></div>
        <div className="space-y-1"><Label htmlFor="ee-pt">Price to (₦)</Label><Input id="ee-pt" name="price_to_ngn" type="number" min={0} defaultValue={v.price_to_ngn ?? ""} /></div>
      </div>
      <div className="space-y-1"><Label htmlFor="ee-desc">Description (markdown)</Label><Textarea id="ee-desc" name="description_md" rows={6} defaultValue={v.description_md ?? ""} /></div>
      <Input name="reason" placeholder="Reason for the edit (required, audited)" aria-label="Reason" required minLength={5} />
      <SubmitButton>Save event</SubmitButton>
    </form>
  );
}
