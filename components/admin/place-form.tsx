"use client";

import dynamic from "next/dynamic";
import { useActionState, useState } from "react";

import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState, type FormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  return (
    <form action={formAction} className="space-y-3 text-sm" data-testid={`${kind}-form`}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {values.city_id ? <input type="hidden" name="city_id" value={values.city_id} /> : null}
      <FormAlert state={state} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input name="name" defaultValue={values.name} placeholder="Name" aria-label="Name" required />
        <Input name="slug" defaultValue={values.slug} placeholder="slug" aria-label="Slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        {kind === "city" ? <Input name="state" defaultValue={values.state ?? ""} placeholder="State" aria-label="State" required /> : null}
        <Input name="sort_order" type="number" defaultValue={values.sort_order} aria-label="Sort order" />
        <Input name="lat" type="number" step="any" value={pos.lat} onChange={(e) => setPos((p) => ({ ...p, lat: Number(e.target.value) }))} aria-label="Latitude" />
        <Input name="lng" type="number" step="any" value={pos.lng} onChange={(e) => setPos((p) => ({ ...p, lng: Number(e.target.value) }))} aria-label="Longitude" />
        <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border bg-secondary/40 px-3.5 font-medium has-[:checked]:border-primary/50 has-[:checked]:bg-primary/10"><input type="checkbox" name="is_active" defaultChecked={values.is_active} className="h-4 w-4 accent-primary" /> Active</label>
      </div>
      {kind === "city" ? <Textarea name="intro_md" defaultValue={values.intro_md ?? ""} rows={2} placeholder="Intro (markdown)" aria-label="Intro" /> : null}
      {MAPBOX_TOKEN ? (
        showMap ? (
          <div className="h-56 overflow-hidden rounded-xl border"><LocationPickerMap token={MAPBOX_TOKEN} value={pos} onChange={setPos} /></div>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowMap(true)}>Place on map</Button>
        )
      ) : null}
      <div>
        <SubmitButton size="sm">{values.id ? "Save" : `Add ${kind}`}</SubmitButton>
      </div>
    </form>
  );
}
