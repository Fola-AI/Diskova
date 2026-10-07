"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAPBOX_TOKEN } from "@/lib/config";

const LocationPickerMap = dynamic(() => import("@/components/map/location-picker-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-secondary" />,
});

export interface PlaceValues {
  id?: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  is_active: boolean;
  sort_order: number;
  state?: string;
  intro_md?: string | null;
  city_id?: string;
}

/** City or area editor with a click-to-place map pin (§11.10 map editor). */
export function PlaceForm({ kind, action, values }: { kind: "city" | "area"; action: (p: FormState, f: FormData) => Promise<FormState>; values: PlaceValues }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [pos, setPos] = useState({ lat: values.lat, lng: values.lng });
  const [showMap, setShowMap] = useState(false);
  const field = "h-9";
  return (
    <form action={formAction} className="space-y-2 text-sm" data-testid={`${kind}-form`}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {values.city_id ? <input type="hidden" name="city_id" value={values.city_id} /> : null}
      <FormAlert state={state} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input name="name" defaultValue={values.name} placeholder="Name" aria-label="Name" className={field} required />
        <Input name="slug" defaultValue={values.slug} placeholder="slug" aria-label="Slug" className={field} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        {kind === "city" ? <Input name="state" defaultValue={values.state ?? ""} placeholder="State" aria-label="State" className={field} required /> : null}
        <Input name="sort_order" type="number" defaultValue={values.sort_order} aria-label="Sort order" className={field} />
        <Input name="lat" type="number" step="any" value={pos.lat} onChange={(e) => setPos((p) => ({ ...p, lat: Number(e.target.value) }))} aria-label="Latitude" className={field} />
        <Input name="lng" type="number" step="any" value={pos.lng} onChange={(e) => setPos((p) => ({ ...p, lng: Number(e.target.value) }))} aria-label="Longitude" className={field} />
        <label className="flex items-center gap-1.5"><input type="checkbox" name="is_active" defaultChecked={values.is_active} className="h-4 w-4" /> Active</label>
      </div>
      {kind === "city" ? <textarea name="intro_md" defaultValue={values.intro_md ?? ""} rows={2} placeholder="Intro (markdown)" aria-label="Intro" className="w-full rounded-md border bg-background p-2" /> : null}
      {MAPBOX_TOKEN ? (
        showMap ? (
          <div className="h-56 overflow-hidden rounded-lg border"><LocationPickerMap token={MAPBOX_TOKEN} value={pos} onChange={setPos} /></div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowMap(true)}>Place on map</Button>
        )
      ) : null}
      <SubmitButton size="sm">{values.id ? "Save" : `Add ${kind}`}</SubmitButton>
    </form>
  );
}
