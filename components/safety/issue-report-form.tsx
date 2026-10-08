"use client";

import { MapPinned } from "lucide-react";
import { useEffect, useState } from "react";

import { submitIssueReportAction } from "@/app/actions/safety";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/vendor-dashboard/field";
import { hasAuthCookie } from "@/lib/client/auth-cookie";
import { getPositionOnce } from "@/lib/client/geo";
import { ISSUE_CATEGORIES } from "@/lib/safety/copy";

/** §10 private report form. Never published, never shown on a map. */
export function IssueReportForm({ cityId, areas }: { cityId: string; areas: Array<{ id: string; name: string }> }) {
  const [signedIn, setSignedIn] = useState(false);
  const [v, setV] = useState({ category: "", description: "", email: "", area_id: "", website: "" });
  const [useLocation, setUseLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ error?: string; message?: string; fe?: Record<string, string[]> }>({});
  useEffect(() => setSignedIn(hasAuthCookie()), []);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  async function submit() {
    setBusy(true);
    const pos = useLocation ? await getPositionOnce() : null;
    const res = await submitIssueReportAction({ ...v, city_id: cityId, lat: pos?.lat ?? null, lng: pos?.lng ?? null });
    setBusy(false);
    if (!res.ok) return setState({ error: res.error, fe: res.fieldErrors });
    setState({ message: res.message });
  }

  if (state.message) return <FormAlert state={{ message: state.message }} />;
  const fe = state.fe ?? {};
  return (
    <div className="space-y-4" data-testid="issue-form">
      {state.error ? <FormAlert state={{ error: state.error }} /> : null}
      <Field id="category" label="What is this about?" errors={fe.category}>
        <select id="category" className={selectClass} value={v.category} onChange={(e) => set("category", e.target.value)}>
          <option value="">Choose…</option>
          {ISSUE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <Field id="area_id" label="Area (optional)">
        <select id="area_id" className={selectClass} value={v.area_id} onChange={(e) => set("area_id", e.target.value)}>
          <option value="">—</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field id="description" label="What happened?" hint="Please don't include other people's personal details." errors={fe.description}>
        <Textarea id="description" rows={5} maxLength={4000} value={v.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      {!signedIn ? (
        <Field id="email" label="Your email" hint="So our team can follow up. Never shown publicly." errors={fe.email}>
          <Input id="email" type="email" inputMode="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
      ) : null}
      {/* Honeypot: hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>Website <input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set("website", e.target.value)} name="website" /></label>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-secondary/30 p-4 text-sm">
        <MapPinned className="h-5 w-5 shrink-0 text-positive" aria-hidden />
        <span className="flex-1"><span className="block font-semibold">Attach my current location</span><span id="issue-loc-help" className="block text-footnote text-muted-foreground">Optional, only seen by our team.</span></span>
        <Switch checked={useLocation} onChange={(e) => setUseLocation(e.target.checked)} aria-describedby="issue-loc-help" />
      </label>
      <Button type="button" size="lg" className="w-full" onClick={submit} loading={busy}>{busy ? "Sending…" : "Send privately"}</Button>
    </div>
  );
}
