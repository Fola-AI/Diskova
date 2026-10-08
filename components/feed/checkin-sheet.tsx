"use client";

import { Camera, Check, CheckCircle2, ChevronDown, MapPinned, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { createCheckinAction, createPostPhotoUploadAction, finalizeCheckinAction } from "@/app/actions/posts";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClass } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { hasAuthCookie } from "@/lib/client/auth-cookie";
import { getPositionOnce } from "@/lib/client/geo";
import { CROWD_LEVELS } from "@/lib/directory/crowd";
import { checkImageFile, uploadToIncoming } from "@/lib/media/client-upload";
import { cn } from "@/lib/utils";
import { VIBES } from "@/lib/validation/constants";
import { trackEvent } from "@/lib/analytics";

const MAX_PHOTOS = 4;
const SHORT: Record<string, string> = { "At capacity": "Full" };

function Choice({
  items,
  value,
  onChange,
  label,
  invalid,
}: {
  items: ReadonlyArray<{ level: number; label: string; className?: string }>;
  value: number | null;
  onChange: (v: number) => void;
  label: string;
  invalid?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2.5 flex w-full items-center justify-between text-sm font-semibold">
        {label}
        {invalid ? <span className="enter-fade text-footnote font-medium text-destructive">Pick one</span> : null}
      </legend>
      <div className="grid grid-cols-5 gap-2">
        {items.map((i) => {
          const on = value === i.level;
          return (
            <button
              key={i.level}
              type="button"
              aria-pressed={on}
              aria-label={i.label}
              onClick={() => onChange(i.level)}
              className={cn(
                "pressable relative flex min-h-[60px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-caption font-semibold",
                on ? "border-positive bg-primary/15 text-foreground" : "bg-secondary/40 text-foreground/85 hover:border-muted-foreground/40",
                invalid && !on && "border-destructive/50",
              )}
            >
              {on ? (
                <span className="pop absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-positive text-background">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
              ) : null}
              {i.className ? <span className={cn("h-3 w-3 rounded-full ring-2 ring-white/10", i.className)} aria-hidden /> : null}
              <span aria-hidden>{SHORT[i.label] ?? i.label}</span>
            </button>
          );
        })}
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
  const [more, setMore] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const previews = useMemo(() => photos.map((f) => (typeof URL !== "undefined" ? URL.createObjectURL(f) : "")), [photos]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  function reset() {
    setCrowd(null); setVibe(null); setWait(""); setFee(""); setNote(""); setPhotos([]); setUseLocation(false); setProgress(null); setError(null); setTried(false); setMore(false);
  }

  const missing = [!crowd && "how busy it is", !vibe && "the vibe"].filter(Boolean) as string[];

  async function submit() {
    if (!crowd || !vibe) {
      setTried(true);
      return;
    }
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
    trackEvent("checkin_submitted", { photos: photos.length });
    setProgress(null);
    if (!done.ok) return setError(done.error);
    if (done.status === "published") toast.success(done.points ? `Checked in! +${done.points} points` : "Checked in!");
    else if (done.holdReason !== "none") toast.message("Your photo is being reviewed — usually under an hour.");
    else toast.message("Thanks — your check-in is under review.");
    window.dispatchEvent(new Event("feed:posted"));
    reset();
    setOpen(false);
  }

  const footer = (
    <div className="space-y-2">
      {missing.length && !progress ? (
        <p id="checkin-missing" className="text-center text-footnote text-muted-foreground">
          Pick {missing.join(" and ")} to post
        </p>
      ) : null}
      <Button
        type="button"
        size="lg"
        loading={progress !== null}
        aria-disabled={missing.length > 0 || undefined}
        aria-describedby={missing.length ? "checkin-missing" : undefined}
        className={cn("w-full", missing.length && "opacity-60")}
        onClick={submit}
      >
        {progress ?? "Post check-in"}
      </Button>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (o && !hasAuthCookie()) { window.location.href = `/login?next=${encodeURIComponent(`/v/${vendorSlug}`)}`; return; } setOpen(o); }}>
      <SheetTrigger asChild>
        <Button type="button" variant="secondary" className="w-full" size="lg"><CheckCircle2 aria-hidden /> Check in</Button>
      </SheetTrigger>
      <SheetContent title={`Check in at ${vendorName}`} description="Tell everyone what it's like right now." footer={footer}>
        <div className="space-y-6 pb-2">
          <Choice label="How busy?" items={CROWD_LEVELS} value={crowd} onChange={setCrowd} invalid={tried && !crowd} />
          <Choice label="Vibe" items={VIBES} value={vibe} onChange={setVibe} invalid={tried && !vibe} />

          <div className="space-y-2.5">
            <p className="text-sm font-semibold">Photos <span className="font-normal text-muted-foreground">(optional, up to {MAX_PHOTOS})</span></p>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" data-testid="checkin-photos"
              aria-label="Add photos" tabIndex={-1}
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                const ok = files.filter((f) => { const p = checkImageFile(f); if (p) toast.error(`${f.name}: ${p}`); return !p; });
                setPhotos((cur) => [...cur, ...ok].slice(0, MAX_PHOTOS));
                e.target.value = "";
              }} />
            <div className="flex flex-wrap gap-2">
              {photos.map((f, i) => (
                <div key={`${f.name}-${i}`} className="pop relative h-[72px] w-[72px] overflow-hidden rounded-xl bg-secondary">
                  {previews[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[i]} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => setPhotos((cur) => cur.filter((_, j) => j !== i))}
                    className="hit absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={photos.length >= MAX_PHOTOS}
                className={cn("border-dashed", photos.length ? "h-[72px] w-auto flex-col gap-1 px-4 text-caption" : "h-12")}
              >
                <Camera aria-hidden /> {photos.length ? `Add photo (${photos.length}/${MAX_PHOTOS})` : "Add photos (optional)"}
              </Button>
            </div>
          </div>

          <div className="surface overflow-hidden rounded-2xl">
            <button
              type="button"
              aria-expanded={more}
              aria-controls="checkin-more"
              onClick={() => setMore((m) => !m)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-sm font-semibold"
            >
              <span>More details <span className="font-normal text-muted-foreground">· wait, entry fee, note</span></span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200 ease-out", more && "rotate-180")} aria-hidden />
            </button>
            <div id="checkin-more" hidden={!more} className="enter-up space-y-4 border-t p-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Wait to get in</span>
                  <select value={wait} onChange={(e) => setWait(e.target.value)} className={nativeSelectClass}>
                    <option value="">Not sure</option>
                    <option value="0">No wait</option>
                    <option value="10">~10 min</option>
                    <option value="20">~20 min</option>
                    <option value="45">30–60 min</option>
                    <option value="90">Over an hour</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Entry fee</span>
                  <span className="relative block">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>₦</span>
                    <Input
                      inputMode="numeric"
                      placeholder="10,000"
                      value={fee}
                      className="pl-8"
                      onChange={(e) => setFee(e.target.value)}
                      onBlur={() => {
                        const n = Number(fee.replace(/[₦,\s]/g, ""));
                        if (fee && Number.isFinite(n)) setFee(n.toLocaleString("en-NG"));
                      }}
                    />
                  </span>
                </label>
              </div>
              <label className="block space-y-1.5 text-sm">
                <span className="flex items-center justify-between font-medium">
                  Note <span className="text-caption font-normal tabular-nums text-muted-foreground">{note.length}/500</span>
                </span>
                <Textarea placeholder="Music, queue, parking…" value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} />
              </label>
            </div>
          </div>

          <label className="surface flex cursor-pointer items-center gap-3 rounded-2xl p-4 text-sm">
            <MapPinned className="h-5 w-5 shrink-0 text-positive" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Mark me as at the venue</span>
              <span id="checkin-loc-help" className="block text-footnote text-muted-foreground">Uses your location once. Never shown publicly.</span>
            </span>
            <Switch checked={useLocation} onChange={(e) => setUseLocation(e.target.checked)} aria-describedby="checkin-loc-help" />
          </label>

          {error ? <FormAlert state={{ error }} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
