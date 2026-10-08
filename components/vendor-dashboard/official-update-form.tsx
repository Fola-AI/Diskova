"use client";

import { Camera, Check, Megaphone, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createVendorImageUploadAction, postOfficialUpdateAction } from "@/app/(vendor)/vendor/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CROWD_LEVELS } from "@/lib/directory/crowd";
import { checkImageFile, uploadToIncoming } from "@/lib/media/client-upload";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

/** Two taps: pick the crowd level, press Post. Photo and note are optional (§1.6, §8.9). */
export function OfficialUpdateForm({ vendorId, vendorSlug }: { vendorId: string; vendorSlug: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ error?: string; message?: string } | null>(null);

  async function post() {
    if (!level) return;
    setBusy(true);
    setOutcome(null);
    try {
      let incomingPath: string | null = null;
      if (file) incomingPath = await uploadToIncoming(file, (mime, size) => createVendorImageUploadAction({ vendorId, mime, size }));
      const res = await postOfficialUpdateAction({ vendorId, crowdLevel: level, note: note || null, incomingPath });
      if (!res.ok) return setOutcome({ error: res.error });
      trackEvent("official_update_posted", { photo: Boolean(incomingPath) });
      if (res.data.status === "published") {
        setOutcome({ message: "Posted! Your update is live on your page." });
      } else if (res.data.holdReason !== "none") {
        setOutcome({ message: "Posted. Your photo is being reviewed — usually under an hour." });
      } else {
        setOutcome({ message: "Thanks — your update is under review." });
      }
      setLevel(null);
      setNote("");
      setFile(null);
    } catch (err) {
      setOutcome({ error: err instanceof Error ? err.message : "Couldn't post." });
    } finally {
      setBusy(false);
    }
  }

  const chosen = CROWD_LEVELS.find((c) => c.level === level);

  return (
    <div className="space-y-6">
      <fieldset className="surface rounded-3xl p-4">
        <legend className="sr-only">How busy is it right now?</legend>
        <p aria-hidden className="mb-3 text-callout font-semibold">How busy is it right now?</p>
        <div className="grid grid-cols-5 gap-2">
          {CROWD_LEVELS.map((c) => {
            const on = level === c.level;
            return (
              <button
                key={c.level}
                type="button"
                onClick={() => setLevel(c.level)}
                aria-pressed={on}
                aria-label={c.label}
                className={cn(
                  "pressable relative flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-caption font-semibold",
                  on ? "border-positive bg-primary/15" : "bg-secondary/40 hover:border-muted-foreground/40",
                )}
              >
                {on ? (
                  <span className="pop absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-positive text-background">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
                <span className={cn("h-4 w-4 rounded-full ring-[3px] ring-white/10", c.className)} aria-hidden />
                <span aria-hidden>{c.level === 5 ? "Full" : c.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-3">
        <label className="block space-y-1.5 text-sm">
          <span className="flex items-center justify-between font-medium">
            Note <span className="text-caption font-normal tabular-nums text-muted-foreground">{note.length}/280</span>
          </span>
          <Textarea aria-label="Optional note" placeholder="Optional: “DJ on at 11, free entry before midnight”" value={note} maxLength={280}
            onChange={(e) => setNote(e.target.value)} rows={2} />
        </label>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" data-testid="official-photo" aria-label="Add a photo" tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const problem = checkImageFile(f);
            if (problem) return toast.error(problem);
            setFile(f);
          }} />
        {file ? (
          <div className="flex items-center gap-2 rounded-xl border bg-secondary/40 px-3 py-2 text-sm">
            <Camera className="h-4 w-4 text-positive" aria-hidden /> <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove photo" onClick={() => setFile(null)}><X aria-hidden /></Button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="border-dashed" onClick={() => input.current?.click()}>
            <Camera aria-hidden /> Add a photo (optional)
          </Button>
        )}
      </div>

      {chosen || note ? (
        <div className="enter-up space-y-2" aria-hidden>
          <p className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">Preview on your page</p>
          <div className="overflow-hidden rounded-2xl border border-accent/35 bg-gradient-to-b from-accent/[0.06] to-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-accent-foreground"><Megaphone className="h-3 w-3" /> Official</span>
              {chosen ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <span className={cn("h-2.5 w-2.5 rounded-full", chosen.className)} /> {chosen.label}
                </span>
              ) : null}
              <span className="text-footnote text-muted-foreground">just now</span>
            </div>
            {note ? <p className="mt-2 text-[15px] leading-relaxed">{note}</p> : null}
            {file ? <p className="mt-2 text-footnote text-muted-foreground">+ 1 photo</p> : null}
          </div>
        </div>
      ) : null}

      {outcome ? <FormAlert state={outcome} /> : null}
      <Button type="button" size="lg" className="h-14 w-full rounded-2xl text-base" disabled={!level} loading={busy} onClick={post}>
        {busy ? "Posting…" : "Post official update"}
      </Button>
      {outcome?.message ? (
        <Button asChild variant="secondary" className="w-full"><Link href={`/v/${vendorSlug}`}>See it on your page</Link></Button>
      ) : null}
    </div>
  );
}
