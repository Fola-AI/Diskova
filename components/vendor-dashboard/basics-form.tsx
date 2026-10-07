"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { createVendorAction, saveVendorStepAction } from "@/app/(vendor)/vendor/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/vendor-dashboard/field";
import { LocationPicker } from "@/components/vendor-dashboard/location-picker";
import { SaveIndicator } from "@/components/vendor-dashboard/save-indicator";
import { StepFooter } from "@/components/vendor-dashboard/step-footer";
import { useAutosave } from "@/components/vendor-dashboard/use-autosave";

export interface BasicsValues {
  name: string;
  tagline: string;
  description_md: string;
  category_id: string;
  city_id: string;
  area_id: string;
  address_line: string;
  lat: number;
  lng: number;
}

interface Option {
  id: string;
  name: string;
}
interface AreaOption extends Option {
  city_id: string;
  lat: number | null;
  lng: number | null;
}

export function BasicsForm({
  vendorId,
  initial,
  categories,
  cities,
  areas,
  mapboxToken,
  basePath,
  nextHref,
}: {
  vendorId: string | null;
  initial: BasicsValues;
  categories: Option[];
  cities: Array<Option & { lat: number | null; lng: number | null }>;
  areas: AreaOption[];
  mapboxToken: string;
  basePath: string;
  nextHref: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<BasicsValues>(initial);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string[]>>({});
  const [creating, setCreating] = useState(false);

  const cityAreas = useMemo(() => areas.filter((a) => a.city_id === values.city_id), [areas, values.city_id]);
  const area = areas.find((a) => a.id === values.area_id) ?? null;

  const save = useCallback(
    (v: BasicsValues) => (vendorId ? saveVendorStepAction(vendorId, "basics", v) : Promise.resolve({ ok: true as const })),
    [vendorId],
  );
  const autosave = useAutosave(values, save);
  const errors = vendorId ? autosave.fieldErrors : createFieldErrors;

  function set<K extends keyof BasicsValues>(key: K, value: BasicsValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function chooseArea(areaId: string) {
    const a = areas.find((x) => x.id === areaId);
    setValues((v) => ({ ...v, area_id: areaId, ...(a?.lat && a?.lng ? { lat: a.lat, lng: a.lng } : {}) }));
  }

  function chooseCity(cityId: string) {
    const c = cities.find((x) => x.id === cityId);
    setValues((v) => ({ ...v, city_id: cityId, area_id: "", ...(c?.lat && c?.lng ? { lat: c.lat, lng: c.lng } : {}) }));
  }

  async function create() {
    setCreating(true);
    setCreateError(null);
    const res = await createVendorAction(values);
    setCreating(false);
    if (!res.ok) {
      setCreateError(res.error);
      setCreateFieldErrors(res.fieldErrors ?? {});
      return;
    }
    router.push(`${basePath}?step=contact`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {createError ? <FormAlert state={{ error: createError }} /> : null}
      <Field id="name" label="Venue name" errors={errors.name}>
        <Input id="name" value={values.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
      </Field>
      <Field id="category_id" label="Category" errors={errors.category_id}>
        <select id="category_id" className={selectClass} value={values.category_id} onChange={(e) => set("category_id", e.target.value)}>
          <option value="">Choose…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="city_id" label="City" errors={errors.city_id}>
          <select id="city_id" className={selectClass} value={values.city_id} onChange={(e) => chooseCity(e.target.value)} disabled={Boolean(vendorId)}>
            <option value="">Choose…</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field id="area_id" label="Area" errors={errors.area_id}>
          <select id="area_id" className={selectClass} value={values.area_id} onChange={(e) => chooseArea(e.target.value)} disabled={!values.city_id}>
            <option value="">Choose…</option>
            {cityAreas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="address_line" label="Street address" hint="Shown on your page and used for directions." errors={errors.address_line}>
        <Input id="address_line" value={values.address_line} onChange={(e) => set("address_line", e.target.value)} maxLength={200} />
      </Field>
      {values.area_id ? (
        <LocationPicker token={mapboxToken} value={{ lat: values.lat, lng: values.lng }} onChange={(p) => setValues((v) => ({ ...v, ...p }))} areaName={area?.name ?? null} />
      ) : null}
      <Field id="tagline" label="Tagline" hint="One line, e.g. “Rooftop cocktails and Afrobeats every Friday”." errors={errors.tagline}>
        <Input id="tagline" value={values.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={160} />
      </Field>
      <Field id="description_md" label="About your venue" errors={errors.description_md}>
        <Textarea id="description_md" rows={5} value={values.description_md} onChange={(e) => set("description_md", e.target.value)} maxLength={10000} />
      </Field>

      {vendorId ? (
        <StepFooter nextHref={nextHref} beforeNext={autosave.flush} status={<SaveIndicator state={autosave.state} error={autosave.error} />} />
      ) : (
        <Button type="button" className="w-full" onClick={create} disabled={creating}>
          {creating ? "Creating…" : "Create listing and continue"}
        </Button>
      )}
    </div>
  );
}
