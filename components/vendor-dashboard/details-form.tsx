"use client";

import { useCallback, useState } from "react";

import { saveVendorStepAction } from "@/app/(vendor)/vendor/actions";
import { Input } from "@/components/ui/input";
import { Field, selectClass } from "@/components/vendor-dashboard/field";
import { HoursEditor } from "@/components/vendor-dashboard/hours-editor";
import { SaveIndicator } from "@/components/vendor-dashboard/save-indicator";
import { StepFooter } from "@/components/vendor-dashboard/step-footer";
import { useAutosave } from "@/components/vendor-dashboard/use-autosave";
import { FEATURES, PRICE_BANDS, type PriceBand } from "@/lib/directory/constants";
import type { OpeningHours } from "@/lib/services/opening-hours";

export interface DetailsValues {
  opening_hours: OpeningHours;
  price_band: PriceBand | null;
  dress_code: string;
  age_policy: string;
  parking_note: string;
  late_night_area_note: string;
  features: string[];
}

export function DetailsForm({
  vendorId,
  initial,
  backHref,
  nextHref,
}: {
  vendorId: string;
  initial: DetailsValues;
  backHref: string;
  nextHref: string;
}) {
  const [values, setValues] = useState(initial);
  const save = useCallback((v: DetailsValues) => saveVendorStepAction(vendorId, "details", v), [vendorId]);
  const autosave = useAutosave(values, save);
  const set = <K extends keyof DetailsValues>(k: K, v: DetailsValues[K]) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="font-sans text-sm font-semibold tracking-normal">Opening hours</h3>
        <HoursEditor value={values.opening_hours} onChange={(v) => set("opening_hours", v)} />
        {autosave.fieldErrors.opening_hours ? <p className="text-xs text-destructive">Check the times — use HH:MM.</p> : null}
      </section>
      <Field id="price_band" label="Price band">
        <select id="price_band" className={selectClass} value={values.price_band ?? ""}
          onChange={(e) => set("price_band", (e.target.value || null) as PriceBand | null)}>
          <option value="">Not set</option>
          {PRICE_BANDS.map((p) => (
            <option key={p.value} value={p.value}>{p.symbol === p.label ? p.label : `${p.symbol} ${p.label}`}</option>
          ))}
        </select>
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Features</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(FEATURES).map(([key, label]) => {
            const on = values.features.includes(key);
            return (
              <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${on ? "border-primary bg-primary/15" : ""}`}>
                <input type="checkbox" className="sr-only" checked={on}
                  onChange={() => set("features", on ? values.features.filter((f) => f !== key) : [...values.features, key])} />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="dress_code" label="Dress code" errors={autosave.fieldErrors.dress_code}>
          <Input id="dress_code" value={values.dress_code} maxLength={120} onChange={(e) => set("dress_code", e.target.value)} />
        </Field>
        <Field id="age_policy" label="Age policy" hint="e.g. 18+ with ID" errors={autosave.fieldErrors.age_policy}>
          <Input id="age_policy" value={values.age_policy} maxLength={120} onChange={(e) => set("age_policy", e.target.value)} />
        </Field>
      </div>
      <Field id="parking_note" label="Parking" errors={autosave.fieldErrors.parking_note}>
        <Input id="parking_note" value={values.parking_note} maxLength={200} onChange={(e) => set("parking_note", e.target.value)} />
      </Field>
      <Field id="late_night_area_note" label="Late-night note" hint="Practical tips for leaving late, e.g. where to wait for a ride." errors={autosave.fieldErrors.late_night_area_note}>
        <Input id="late_night_area_note" value={values.late_night_area_note} maxLength={300} onChange={(e) => set("late_night_area_note", e.target.value)} />
      </Field>
      <StepFooter backHref={backHref} nextHref={nextHref} beforeNext={autosave.flush} status={<SaveIndicator state={autosave.state} error={autosave.error} />} />
    </div>
  );
}
