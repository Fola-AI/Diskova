"use client";

import { useCallback, useState } from "react";

import { saveVendorStepAction } from "@/app/(vendor)/vendor/actions";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/vendor-dashboard/field";
import { SaveIndicator } from "@/components/vendor-dashboard/save-indicator";
import { StepFooter } from "@/components/vendor-dashboard/step-footer";
import { useAutosave } from "@/components/vendor-dashboard/use-autosave";

export interface ContactValues {
  phone: string;
  whatsapp: string;
  email: string;
  website_url: string;
  booking_url: string;
  instagram_handle: string;
  tiktok_handle: string;
  x_handle: string;
}

const FIELDS: Array<{ key: keyof ContactValues; label: string; type?: string; inputMode?: "tel" | "email" | "url"; hint?: string }> = [
  { key: "whatsapp", label: "WhatsApp number", type: "tel", inputMode: "tel", hint: "Visitors can message you in one tap." },
  { key: "phone", label: "Phone number", type: "tel", inputMode: "tel" },
  { key: "email", label: "Email", type: "email", inputMode: "email" },
  { key: "website_url", label: "Website", inputMode: "url" },
  { key: "booking_url", label: "Booking / reservation link", inputMode: "url", hint: "Optional. We link out — bookings never happen on this site." },
  { key: "instagram_handle", label: "Instagram handle" },
  { key: "tiktok_handle", label: "TikTok handle" },
  { key: "x_handle", label: "X handle" },
];

export function ContactForm({
  vendorId,
  initial,
  backHref,
  nextHref,
}: {
  vendorId: string;
  initial: ContactValues;
  backHref: string;
  nextHref: string;
}) {
  const [values, setValues] = useState(initial);
  const save = useCallback((v: ContactValues) => saveVendorStepAction(vendorId, "contact", v), [vendorId]);
  const autosave = useAutosave(values, save);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Add at least one way for visitors to reach you.</p>
      {FIELDS.map((f) => (
        <Field key={f.key} id={f.key} label={f.label} hint={f.hint} errors={autosave.fieldErrors[f.key]}>
          <Input
            id={f.key}
            type={f.type ?? "text"}
            inputMode={f.inputMode}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            aria-invalid={Boolean(autosave.fieldErrors[f.key])}
          />
        </Field>
      ))}
      <StepFooter backHref={backHref} nextHref={nextHref} beforeNext={autosave.flush} status={<SaveIndicator state={autosave.state} error={autosave.error} />} />
    </div>
  );
}
