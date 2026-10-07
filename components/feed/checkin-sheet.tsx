"use client";

import { Camera, CheckCircle2, Loader2, MapPinned, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createCheckinAction, createPostPhotoUploadAction, finalizeCheckinAction } from "@/app/actions/posts";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { hasAuthCookie } from "@/lib/client/auth-cookie";
import { getPositionOnce } from "@/lib/client/geo";
import { CROWD_LEVELS } from "@/lib/directory/crowd";
import { checkImageFile, uploadToIncoming } from "@/lib/media/client-upload";
import { cn } from "@/lib/utils";
import { VIBES } from "@/lib/validation/posts";

const MAX_PHOTOS = 4;

function Choice({ items, value, onChange, label }: { items: ReadonlyArray<{ level: number; label: string; className?: string }>; value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {items.map((i) => (
          <button key={i.level} type="button" aria-pressed={value === i.level} onClick={() => onChange(i.level)}
            className={cn("flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium", value === i.level ? "border-foreground ring-2 ring-ring" : "hover:border-primary/60")}>
            {i.className ? <span className={cn("h-2.5 w-2.5 rounded-full", i.className)} aria-hidden /> : null}
            {i.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** §8.3 check-in: crowd + vibe required; wait, cover fee, note and up to 4 photos optional. */
export function CheckinSheet({ vendorId, vendorSlug, vendorName }: { vendorId: string; vendorSlug: string; vendorName: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [crowd, setCrowd] = useState<number | null>(null);
  const [vibe, setVibe] = useState<number | null>(null);
  const [wait, setWait] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [useLocation, setUseLocation] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCrowd(null); setVibe(null); setWait(""); setFee(""); setNote(""); setPhotos([]); setUseLocation(false); setProgress(null); setError(null);
  }

  async function submit() {
    if (!crowd || !vibe) return;
    setError(null);
    setProgress("Saving…");
    const pos = useLocation ? await getPositionOnce() : null;
    const created = await createCheckinAction({
      vendorId, crowdLevel: crowd, vibe, waitMinutes: wait, coverFeeNgn: fee.replace(/[₦,\s]/g, ""), note,
      photoCount: photos.length, lat: pos?.lat ?? null, lng: pos?.lng ?? null, consentNow: useLocation,
    });
    if (!created.ok) {
      setProgress(null);
      if (created.needsLogin) window.location.href = `/login?next=${encodeURIComponent(`/v/${vendorSlug}`)}`;
      return setError(created.error);
    }
    // ONE image per request (§7.6): upload + process each photo in turn.
    for (const [i, file] of photos.entries()) {
      setProgress(`Uploading photo ${i + 1} of ${photos.length}…`);
      try {
        const path = await uploadToIncoming(file, (mime, size) => createPostPhotoUploadAction({ mime, size }));
        const res = await fetch("/api/media/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, purpose: "post", postId: created.postId }),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Photo failed.");
      } catch (err) {
        toast.error(`Photo ${i + 1} skipped: ${err instanceof Error ? err.message : "upload failed"}`);
      }
    }
    setProgress("Publishing…");
    const done = await finalizeCheckinAction(created.postId, vendorSlug);
    setProgress(null);
    if (!done.ok) return setError(done.error);
    if (done.status === "published") toast.success(done.points ? `Checked in! +${done.points} points` : "Checked in!");
    else if (done.holdReason !== "none") toast.message("Your photo is being reviewed — usually under an hour.");
    else toast.message("Thanks — your check-in is under review.");
    window.dispatchEvent(new Event("feed:posted"));
    reset();
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (o && !hasAuthCookie()) { window.location.href = `/login?next=${encodeURIComponent(`/v/${vendorSlug}`)}`; return; } setOpen(o); }}>
      <SheetTrigger asChild>
        <Button type="button" className="w-full" size="lg"><CheckCircle2 aria-hidden /> Check in</Button>
      </SheetTrigger>
      <SheetContent title={`Check in at ${vendorName}`} description="Tell everyone what it's like right now.">
        <div className="space-y-5">
          <Choice label="How busy?" items={CROWD_LEVELS} value={crowd} onChange={setCrowd} />
          <Choice label="Vibe" items={VIBES} value={vibe} onChange={setVibe} />
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Wait to get in</span>
              <select value={wait} onChange={(e) => setWait(e.target.value)} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base md:text-sm">
                <option value="">Not sure</option>
                <option value="0">No wait</option>
                <option value="10">~10 min</option>
                <option value="20">~20 min</option>
                <option value="45">30–60 min</option>
                <option value="90">Over an hour</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Entry fee (₦)</span>
              <Input inputMode="numeric" placeholder="e.g. 10000" value={fee} onChange={(e) => setFee(e.target.value)} />
            </label>
          </div>
          <Textarea aria-label="Note (optional)" placeholder="Anything useful? Music, queue, parking…" value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} />

          <div className="space-y-2">
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" data-testid="checkin-photos"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                const ok = files.filter((f) => { const p = checkImageFile(f); if (p) toast.error(`${f.name}: ${p}`); return !p; });
                setPhotos((cur) => [...cur, ...ok].slice(0, MAX_PHOTOS));
                e.target.value = "";
              }} />
            {photos.length ? (
              <ul className="flex flex-wrap gap-2 text-xs">
                {photos.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-md border px-2 py-1">
                    {f.name.slice(0, 18)}
                    <button type="button" aria-label="Remove photo" onClick={() => setPhotos((cur) => cur.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
              <Camera aria-hidden /> {photos.length ? `Add photo (${photos.length}/${MAX_PHOTOS})` : "Add photos (optional)"}
            </Button>
          </div>

          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input type="checkbox" checked={useLocation} onChange={(e) => setUseLocation(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[hsl(var(--primary))]" />
            <span>
              <span className="inline-flex items-center gap-1 font-medium"><MapPinned className="h-4 w-4" aria-hidden /> Mark me as at the venue</span>
              <span className="block text-muted-foreground">Uses your location once to check you&apos;re nearby. Never shown publicly. You can turn this off in Settings.</span>
            </span>
          </label>

          {error ? <FormAlert state={{ error }} /> : null}
          <Button type="button" className="w-full" size="lg" disabled={!crowd || !vibe || progress !== null} onClick={submit}>
            {progress ? <><Loader2 className="animate-spin" aria-hidden /> {progress}</> : "Post check-in"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
