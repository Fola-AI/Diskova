"use client";

import { useActionState } from "react";

import { vendorEditAction } from "@/app/admin/(secure)/vendors/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface VendorEditValues {
  name: string; tagline: string | null; description_md: string | null; phone: string | null;
  whatsapp: string | null; instagram_handle: string | null; website_url: string | null;
}

export function VendorEditForm({ vendorId, values }: { vendorId: string; values: VendorEditValues }) {
  const [state, action] = useActionState(vendorEditAction, initialFormState);
  const field = (name: keyof VendorEditValues, label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`ve-${name}`}>{label}</Label>
      <Input id={`ve-${name}`} name={name} defaultValue={values[name] ?? ""} />
    </div>
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="vendorId" value={vendorId} />
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", "Name")}
        {field("tagline", "Tagline")}
        {field("phone", "Phone")}
        {field("whatsapp", "WhatsApp")}
        {field("instagram_handle", "Instagram")}
        {field("website_url", "Website")}
      </div>
      <div className="space-y-1">
        <Label htmlFor="ve-description">Description (markdown)</Label>
        <Textarea id="ve-description" name="description_md" rows={5} defaultValue={values.description_md ?? ""} />
      </div>
      <Input name="reason" placeholder="Reason for the edit (required, audited)" aria-label="Reason" required minLength={5} />
      <SubmitButton size="sm">Save changes</SubmitButton>
    </form>
  );
}
