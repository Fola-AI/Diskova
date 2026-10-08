"use client";

import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveItineraryAction, setItineraryStatusAction } from "@/app/admin/(secure)/itineraries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nativeSelectClass } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { computeTotals, formatMoney } from "@/lib/itineraries/totals";

export interface EditorStop { day: number; time_label: string; title: string; vendor_slug: string; description_md: string; cost_ngn: string; cost_note: string }
export interface EditorValue { id?: string; slug: string; title: string; cityId: string; days: number; excerpt: string; intro_md: string; seo_title: string; seo_description: string; items: EditorStop[]; status?: string }

const blank = (day: number): EditorStop => ({ day, time_label: "", title: "", vendor_slug: "", description_md: "", cost_ngn: "", cost_note: "" });
const NO_FX = { gbpPerNgn: null, usdPerNgn: null };

export function ItineraryEditor({ initial, cities }: { initial: EditorValue; cities: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  // Which button started the pending transition (spinner placement only).
  const [busy, setBusy] = useState<"save" | "draft" | "published" | "archived" | null>(null);
  const set = <K extends keyof EditorValue>(k: K, val: EditorValue[K]) => setV((cur) => ({ ...cur, [k]: val }));
  const setStop = (i: number, patch: Partial<EditorStop>) => setV((cur) => ({ ...cur, items: cur.items.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const move = (i: number, dir: -1 | 1) => setV((cur) => { const items = [...cur.items]; const j = i + dir; if (j < 0 || j >= items.length) return cur; [items[i], items[j]] = [items[j]!, items[i]!]; return { ...cur, items }; });
  const totals = computeTotals(v.items.map((s) => ({ day: Number(s.day), cost_ngn: s.cost_ngn === "" ? null : Number(s.cost_ngn) })), v.days);

  const save = () => {
    setBusy("save");
    start(async () => {
      const r = await saveItineraryAction({ ...v, items: v.items.map((s) => ({ ...s, day: Number(s.day) })) });
      if (!r.ok) return void toast.error(r.error ?? "Couldn't save.");
      toast.success("Saved");
      if (!v.id && r.id) router.push(`/admin/itineraries/${r.id}`);
      else router.refresh();
    });
  };
  const status = (s: "draft" | "published" | "archived") => {
    setBusy(s);
    start(async () => {
      const r = await setItineraryStatusAction(v.id!, s);
      if (r.ok) { toast.success(r.message ?? "Done"); set("status", s); router.refresh(); } else toast.error(r.error ?? "Failed");
    });
  };
  const spin = (k: NonNullable<typeof busy>) => pending && busy === k;
  const field = "space-y-1.5";

  return (
    <div className="space-y-6" data-testid="itinerary-editor">
      <div className="surface grid gap-4 rounded-2xl p-4 sm:grid-cols-2">
        <div className={`${field} sm:col-span-2`}><Label htmlFor="it-title">Title</Label><Input id="it-title" value={v.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div className={field}><Label htmlFor="it-slug">Slug</Label><Input id="it-slug" value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} placeholder="three-days-in-lagos" /></div>
        <div className={field}><Label htmlFor="it-days">Days</Label><Input id="it-days" type="number" min={1} max={14} value={v.days} onChange={(e) => set("days", Math.max(1, Math.min(14, Number(e.target.value) || 1)))} /></div>
        <div className={field}><Label htmlFor="it-city">City</Label>
          <select id="it-city" value={v.cityId} onChange={(e) => set("cityId", e.target.value)} className={nativeSelectClass}>
            <option value="">Nigeria (several cities)</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className={field}><Label htmlFor="it-excerpt">Excerpt</Label><Input id="it-excerpt" value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={300} /></div>
        <div className={`${field} sm:col-span-2`}><Label htmlFor="it-intro">Intro (markdown)</Label><Textarea id="it-intro" rows={4} value={v.intro_md} onChange={(e) => set("intro_md", e.target.value)} /></div>
        <div className={field}><Label htmlFor="it-seo-t">SEO title</Label><Input id="it-seo-t" value={v.seo_title} onChange={(e) => set("seo_title", e.target.value)} maxLength={70} /></div>
        <div className={field}><Label htmlFor="it-seo-d">SEO description</Label><Input id="it-seo-d" value={v.seo_description} onChange={(e) => set("seo_description", e.target.value)} maxLength={170} /></div>
      </div>

      <section className="space-y-3">
        <h2 className="text-title font-semibold">Stops <span className="text-footnote font-normal tabular-nums text-muted-foreground">({v.items.length})</span></h2>
        <ol className="space-y-3">
          {v.items.map((s, i) => (
            <li key={i} className="surface space-y-3 rounded-2xl p-4" data-testid="editor-stop">
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Stop {i + 1}</p>
                <div className="-my-1 -mr-2 flex gap-1">
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp aria-hidden /></Button>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === v.items.length - 1}><ArrowDown aria-hidden /></Button>
                  <Button type="button" size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Remove stop ${i + 1}`} onClick={() => setV((cur) => ({ ...cur, items: cur.items.filter((_, j) => j !== i) }))}><Trash2 aria-hidden /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                <Input aria-label={`Stop ${i + 1} day`} type="number" min={1} max={v.days} value={s.day} onChange={(e) => setStop(i, { day: Number(e.target.value) || 1 })} />
                <Input aria-label={`Stop ${i + 1} time`} placeholder="Evening / 19:00" value={s.time_label} onChange={(e) => setStop(i, { time_label: e.target.value })} />
                <Input aria-label={`Stop ${i + 1} title`} placeholder="What happens" className="col-span-2" value={s.title} onChange={(e) => setStop(i, { title: e.target.value })} />
                <Input aria-label={`Stop ${i + 1} venue slug`} placeholder="venue slug (optional)" value={s.vendor_slug} onChange={(e) => setStop(i, { vendor_slug: e.target.value.trim() })} />
                <Input aria-label={`Stop ${i + 1} cost`} type="number" inputMode="numeric" min={0} placeholder="₦ per person" className="tabular-nums" value={s.cost_ngn} onChange={(e) => setStop(i, { cost_ngn: e.target.value })} />
              </div>
              <Input aria-label={`Stop ${i + 1} cost note`} placeholder="Cost note (e.g. entry + 2 drinks)" value={s.cost_note} onChange={(e) => setStop(i, { cost_note: e.target.value })} />
              <Textarea aria-label={`Stop ${i + 1} description`} rows={2} placeholder="Description (optional)" value={s.description_md} onChange={(e) => setStop(i, { description_md: e.target.value })} />
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" onClick={() => setV((cur) => ({ ...cur, items: [...cur.items, blank(cur.items.at(-1)?.day ?? 1)] }))}><Plus aria-hidden /> Add stop</Button>
      </section>

      <section className="surface space-y-1 rounded-2xl p-4 text-sm tabular-nums" data-testid="editor-totals">
        <p className="mb-1 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Running cost</p>
        {totals.days.map((d) => <p key={d.day} className="text-muted-foreground">Day {d.day}: {formatMoney(d.subtotal, "NGN", NO_FX)} · running {formatMoney(d.runningTotal, "NGN", NO_FX)}{d.unpriced ? ` · ${d.unpriced} without cost` : ""}</p>)}
        <p className="border-t pt-2 text-callout font-semibold">Trip total: {formatMoney(totals.total, "NGN", NO_FX)}</p>
      </section>

      <div className="surface z-20 flex sm:sticky sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex-wrap items-center gap-2 rounded-2xl bg-card/95 p-3 backdrop-blur">
        <Button type="button" onClick={save} disabled={pending} loading={spin("save")}>Save</Button>
        {v.id ? (
          <>
            {v.status !== "published" ? <Button type="button" variant="secondary" onClick={() => status("published")} disabled={pending} loading={spin("published")}>Publish</Button> : <Button type="button" variant="secondary" onClick={() => status("draft")} disabled={pending} loading={spin("draft")}>Unpublish</Button>}
            {v.status !== "archived" ? <Button type="button" variant="ghost" onClick={() => status("archived")} disabled={pending} loading={spin("archived")}>Archive</Button> : null}
            {v.status === "published" ? <a href={`/itineraries/${v.slug}`} className="hit inline-flex h-10 items-center gap-1 text-sm font-semibold text-positive underline-offset-4 hover:underline" target="_blank" rel="noreferrer">View live <ExternalLink className="h-4 w-4" aria-hidden /></a> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
