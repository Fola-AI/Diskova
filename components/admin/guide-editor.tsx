"use client";

import { Eye, ImagePlus, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { createGuideCoverUploadAction, restoreRevisionAction, saveGuideAction, setGuideStatusAction } from "@/app/admin/(secure)/content/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/components/vendor-dashboard/field";
import { markdownToHtml, parseBlocks } from "@/lib/content/markdown";
import { checkImageFile, uploadToIncoming } from "@/lib/media/client-upload";
import { GUIDE_TYPES } from "@/lib/validation/constants";

export interface GuideFormValues {
  title: string;
  slug: string;
  type: string;
  city_id: string;
  excerpt: string;
  body_md: string;
  cover_image_url: string;
  tags: string;
  seo_title: string;
  seo_description: string;
}

const SNIPPETS: Array<[string, string]> = [
  ["Venue card", '\n<VendorCard slug="venue-slug" />\n'],
  ["Map", '\n<Map vendors="venue-one, venue-two" />\n'],
  ["Price table", '\n<PriceTable vendor="venue-slug" />\n'],
  ["Callout", '\n<Callout type="tip">\nUseful tip here.\n</Callout>\n'],
];

/** Live preview in the editor: same parser/renderer, embeds shown as placeholders. */
function Preview({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseBlocks(markdown), [markdown]);
  return (
    <div className="space-y-4 text-[15px] leading-7 [&_a]:underline [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc" data-testid="cms-preview">
      {blocks.map((b, i) =>
        b.type === "markdown" ? (
          <div key={i} className="space-y-4" dangerouslySetInnerHTML={{ __html: markdownToHtml(b.text) }} />
        ) : b.type === "callout" ? (
          <aside key={i} className="rounded-lg border border-accent/50 bg-accent/10 p-3 text-sm" dangerouslySetInnerHTML={{ __html: markdownToHtml(b.text) }} />
        ) : (
          <div key={i} className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            [{b.type === "vendor-card" ? `Venue card: ${b.slug}` : b.type === "map" ? `Map: ${b.slugs.join(", ")}` : `Prices: ${b.vendor}`}]
          </div>
        ),
      )}
    </div>
  );
}

export function GuideEditor({
  id,
  initial,
  status,
  cities,
  revisions,
  previewHref,
  publicHref,
}: {
  id: string | null;
  initial: GuideFormValues;
  status: string | null;
  cities: Array<{ id: string; name: string }>;
  revisions: Array<{ id: string; saved_at: string }>;
  previewHref: string | null;
  publicHref: string | null;
}) {
  const router = useRouter();
  const body = useRef<HTMLTextAreaElement>(null);
  const cover = useRef<HTMLInputElement>(null);
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string[]>>({});
  const set = (k: keyof GuideFormValues, val: string) => setV((s) => ({ ...s, [k]: val }));

  async function save(): Promise<boolean> {
    setBusy("save");
    const res = await saveGuideAction(id, v);
    setBusy(null);
    if (!res.ok) {
      setFe(res.fieldErrors ?? {});
      toast.error(res.error);
      return false;
    }
    setFe({});
    toast.success("Saved.");
    if (!id) router.push(`/admin/content/${res.id}`);
    else router.refresh();
    return true;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function changeStatus(next: "draft" | "review" | "published" | "archived") {
    if (!id) return;
    if (!(await save())) return;
    setBusy(next);
    const res = await setGuideStatusAction(id, next);
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(next === "published" ? "Published." : `Status: ${next}`);
    router.refresh();
  }

  function insert(snippet: string) {
    const el = body.current;
    if (!el) return set("body_md", v.body_md + snippet);
    const { selectionStart: a, selectionEnd: b } = el;
    set("body_md", v.body_md.slice(0, a) + snippet + v.body_md.slice(b));
    requestAnimationFrame(() => el.setSelectionRange(a + snippet.length, a + snippet.length));
  }

  async function onCover(file: File) {
    const problem = checkImageFile(file);
    if (problem) return toast.error(problem);
    setBusy("cover");
    try {
      const path = await uploadToIncoming(file, (mime, size) => createGuideCoverUploadAction({ mime, size }));
      const res = await fetch("/api/media/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, purpose: "guide_cover" }) });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      set("cover_image_url", json.url);
      toast.success("Cover uploaded — remember to save.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {status ? <Badge variant={status === "published" ? "default" : "secondary"} data-testid="guide-status">{status}</Badge> : null}
        <Button type="button" onClick={save} disabled={busy !== null}>{busy === "save" ? <Loader2 className="animate-spin" /> : <Save aria-hidden />}Save</Button>
        {id ? (
          <>
            <Button type="button" variant="secondary" onClick={() => changeStatus("review")} disabled={busy !== null}>Send to review</Button>
            <Button type="button" variant="gold" onClick={() => changeStatus("published")} disabled={busy !== null}>Publish</Button>
            <Button type="button" variant="ghost" onClick={() => changeStatus("archived")} disabled={busy !== null}>Archive</Button>
          </>
        ) : null}
        {previewHref ? <Button asChild variant="outline" size="sm"><a href={previewHref} target="_blank" rel="noopener"><Eye aria-hidden />Draft preview</a></Button> : null}
        {publicHref && status === "published" ? <Button asChild variant="link" size="sm"><Link href={publicHref}>View live</Link></Button> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="title" label="Title" errors={fe.title}><Input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field id="slug" label="Slug" hint="Blank = from the title." errors={fe.slug}><Input id="slug" value={v.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
        <Field id="type" label="Type">
          <select id="type" className={selectClass} value={v.type} onChange={(e) => set("type", e.target.value)}>
            {GUIDE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field id="city_id" label="City" errors={fe.city_id}>
          <select id="city_id" className={selectClass} value={v.city_id} onChange={(e) => set("city_id", e.target.value)}>
            <option value="">— none (national) —</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <Field id="excerpt" label="Excerpt" errors={fe.excerpt}><Textarea id="excerpt" rows={2} maxLength={400} value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></Field>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">Body (markdown)</span>
          {SNIPPETS.map(([label, snippet]) => (
            <Button key={label} type="button" size="sm" variant="outline" onClick={() => insert(snippet)}>+ {label}</Button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea ref={body} aria-label="Body (markdown)" rows={24} className="font-mono text-sm" value={v.body_md} onChange={(e) => set("body_md", e.target.value)} />
          <div className="rounded-xl border p-4"><Preview markdown={v.body_md} /></div>
        </div>
        {fe.body_md ? <p className="text-xs text-destructive">{fe.body_md[0]}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tags" label="Tags (comma separated)" hint="e.g. nightlife, daytime, food — used by the city hub tabs."><Input id="tags" value={v.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Cover image</span>
          <input ref={cover} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onCover(f); }} />
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => cover.current?.click()} disabled={busy === "cover"}><ImagePlus aria-hidden />{v.cover_image_url ? "Replace" : "Upload"}</Button>
            {v.cover_image_url ? <span className="truncate text-xs text-muted-foreground">{v.cover_image_url.split("/").pop()}</span> : null}
          </div>
        </div>
        <Field id="seo_title" label="SEO title (≤ 70)" errors={fe.seo_title}><Input id="seo_title" maxLength={70} value={v.seo_title} onChange={(e) => set("seo_title", e.target.value)} /></Field>
        <Field id="seo_description" label="SEO description (≤ 170)" errors={fe.seo_description}><Input id="seo_description" maxLength={170} value={v.seo_description} onChange={(e) => set("seo_description", e.target.value)} /></Field>
      </div>

      {revisions.length ? (
        <details className="rounded-xl border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Revisions ({revisions.length})</summary>
          <ul className="mt-2 divide-y">
            {revisions.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span>{new Date(r.saved_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</span>
                <Button type="button" size="sm" variant="ghost" onClick={async () => {
                  if (!id) return;
                  const res = await restoreRevisionAction(id, r.id);
                  if (!res.ok) return toast.error(res.error);
                  toast.success("Revision restored.");
                  router.refresh();
                  window.location.reload();
                }}>Restore</Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
