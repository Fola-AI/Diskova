"use client";

import { useEffect, useMemo, useState } from "react";

import { submitEventAction, venuesForCityAction } from "@/app/actions/events";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/vendor-dashboard/field";
import { EVENT_CATEGORIES } from "@/lib/validation/constants";

interface Option { id: string; name: string }

export function EventSubmitForm({
  cities,
  areas,
  myVenues,
  defaultVendorId,
}: {
  cities: Array<Option & { slug: string }>;
  areas: Array<Option & { city_id: string }>;
  myVenues: Array<Option & { city_id: string }>;
  defaultVendorId?: string | null;
}) {
  const preset = myVenues.find((v) => v.id === defaultVendorId) ?? null;
  const [v, setV] = useState({
    title: "", description_md: "", city_id: preset?.city_id ?? cities[0]?.id ?? "", area_id: "",
    venue_vendor_id: preset?.id ?? "", venue_name_freeform: "", vendor_id: preset?.id ?? "",
    starts_local: "", ends_local: "", category: "party", ticket_url: "", is_free: false, price_from_ngn: "", price_to_ngn: "",
  });
  const [venues, setVenues] = useState<Option[]>([]);
  const [state, setState] = useState<{ error?: string; message?: string; fe?: Record<string, string[]> }>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, val: string | boolean) => setV((s) => ({ ...s, [k]: val }));
  const cityAreas = useMemo(() => areas.filter((a) => a.city_id === v.city_id), [areas, v.city_id]);
  const fe = state.fe ?? {};

  useEffect(() => {
    if (!v.city_id) return;
    void venuesForCityAction(v.city_id).then(setVenues);
  }, [v.city_id]);

  async function submit() {
    setBusy(true);
    const res = await submitEventAction(v);
    setBusy(false);
    if (!res.ok) {
      if (res.needsLogin) window.location.href = "/login?next=%2Fevents%2Fsubmit";
      return setState({ error: res.error, fe: res.fieldErrors });
    }
    setState({ message: "Thanks! Your event is in review — we'll email you when it's listed." });
  }

  if (state.message) return <FormAlert state={state} />;

  return (
    <div className="space-y-5">
      {state.error ? <FormAlert state={{ error: state.error }} /> : null}
      <Field id="title" label="Event name" errors={fe.title}>
        <Input id="title" value={v.title} maxLength={140} onChange={(e) => set("title", e.target.value)} />
      </Field>
      {myVenues.length ? (
        <Field id="vendor_id" label="Post as" hint="Events posted as your venue show it as the organiser.">
          <select id="vendor_id" className={selectClass} value={v.vendor_id} onChange={(e) => {
            const venue = myVenues.find((m) => m.id === e.target.value);
            setV((s) => ({ ...s, vendor_id: e.target.value, ...(venue ? { venue_vendor_id: venue.id, city_id: venue.city_id } : {}) }));
          }}>
            <option value="">Myself</option>
            {myVenues.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="city_id" label="City" errors={fe.city_id}>
          <select id="city_id" className={selectClass} value={v.city_id} onChange={(e) => setV((s) => ({ ...s, city_id: e.target.value, area_id: "", venue_vendor_id: "" }))}>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field id="area_id" label="Area (optional)">
          <select id="area_id" className={selectClass} value={v.area_id} onChange={(e) => set("area_id", e.target.value)}>
            <option value="">—</option>
            {cityAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </div>
      <Field id="venue_vendor_id" label="Venue" hint="Pick a listed venue, or type the venue name below.">
        <select id="venue_vendor_id" className={selectClass} value={v.venue_vendor_id} onChange={(e) => set("venue_vendor_id", e.target.value)}>
          <option value="">Not listed</option>
          {venues.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </Field>
      {!v.venue_vendor_id ? (
        <Field id="venue_name_freeform" label="Venue name" errors={fe.venue_name_freeform}>
          <Input id="venue_name_freeform" value={v.venue_name_freeform} maxLength={140} onChange={(e) => set("venue_name_freeform", e.target.value)} />
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="starts_local" label="Starts (Lagos time)" errors={fe.starts_local}>
          <Input id="starts_local" type="datetime-local" value={v.starts_local} onChange={(e) => set("starts_local", e.target.value)} />
        </Field>
        <Field id="ends_local" label="Ends (optional)" errors={fe.ends_local}>
          <Input id="ends_local" type="datetime-local" value={v.ends_local} onChange={(e) => set("ends_local", e.target.value)} />
        </Field>
      </div>
      <Field id="category" label="Type">
        <select id="category" className={selectClass} value={v.category} onChange={(e) => set("category", e.target.value)}>
          {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={v.is_free} onChange={(e) => set("is_free", e.target.checked)} className="h-5 w-5 accent-[hsl(var(--primary))]" />
        Free entry
      </label>
      {!v.is_free ? (
        <div className="grid grid-cols-2 gap-4">
          <Field id="price_from_ngn" label="Price from (₦)" errors={fe.price_from_ngn}>
            <Input id="price_from_ngn" inputMode="numeric" value={v.price_from_ngn} onChange={(e) => set("price_from_ngn", e.target.value)} />
          </Field>
          <Field id="price_to_ngn" label="Price to (₦)" errors={fe.price_to_ngn}>
            <Input id="price_to_ngn" inputMode="numeric" value={v.price_to_ngn} onChange={(e) => set("price_to_ngn", e.target.value)} />
          </Field>
        </div>
      ) : null}
      <Field id="ticket_url" label="Ticket link (optional)" hint="We link out — tickets are never sold here." errors={fe.ticket_url}>
        <Input id="ticket_url" inputMode="url" value={v.ticket_url} onChange={(e) => set("ticket_url", e.target.value)} />
      </Field>
      <Field id="description_md" label="Description">
        <Textarea id="description_md" rows={5} value={v.description_md} maxLength={20000} onChange={(e) => set("description_md", e.target.value)} />
      </Field>
      <Button type="button" className="w-full" size="lg" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</Button>
    </div>
  );
}
