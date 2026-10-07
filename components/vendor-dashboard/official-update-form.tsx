"use client";

import { Camera, Loader2, X } from "lucide-react";
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

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-3 text-sm font-medium">How busy is it right now?</legend>
        <div className="grid grid-cols-5 gap-2">
          {CROWD_LEVELS.map((c) => (
            <button
              key={c.level}
              type="button"
              onClick={() => setLevel(c.level)}
              aria-pressed={level === c.level}
              className={cn(
                "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-medium transition-colors",
                level === c.level ? "border-foreground ring-2 ring-ring" : "hover:border-primary/60",
              )}
            >
              <span className={cn("h-3 w-3 rounded-full", c.className)} aria-hidden />
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Textarea aria-label="Optional note" placeholder="Optional: “DJ on at 11, free entry before midnight”" value={note} maxLength={280}
          onChange={(e) => setNote(e.target.value)} rows={2} />
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" data-testid="official-photo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const problem = checkImageFile(f);
            if (problem) return toast.error(problem);
            setFile(f);
          }} />
        {file ? (
          <div className="flex items-center gap-2 text-sm">
            <Camera className="h-4 w-4" aria-hidden /> {file.name}
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove photo" onClick={() => setFile(null)}><X aria-hidden /></Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()}>
            <Camera aria-hidden /> Add a photo (optional)
          </Button>
        )}
      </div>

      {outcome ? <FormAlert state={outcome} /> : null}
      <Button type="button" size="lg" className="w-full" disabled={!level || busy} onClick={post}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {busy ? "Posting…" : "Post official update"}
      </Button>
      {outcome?.message ? (
        <Button asChild variant="link" className="w-full"><Link href={`/v/${vendorSlug}`}>See it on your page</Link></Button>
      ) : null}
    </div>
  );
}
