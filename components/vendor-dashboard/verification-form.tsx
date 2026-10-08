"use client";

import { FileCheck2, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { createVerificationDocUploadAction, submitVerificationAction } from "@/app/(vendor)/vendor/actions";
import { FormAlert } from "@/components/forms/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/vendor-dashboard/field";
import { uploadToIncoming } from "@/lib/media/client-upload";

const DOC_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

function DocUpload({ vendorId, label, testId, onUploaded }: { vendorId: string; label: string; testId: string; onUploaded: (path: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <input
        ref={input}
        type="file"
        accept={DOC_ACCEPT}
        className="sr-only"
        data-testid={testId}
        aria-label={label}
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setState("busy");
          setError(null);
          try {
            const path = await uploadToIncoming(file, (mime, size) => createVerificationDocUploadAction({ vendorId, mime, size }), "verification-docs");
            onUploaded(path);
            setState("done");
          } catch (err) {
            setState("error");
            setError(err instanceof Error ? err.message : "Upload failed.");
          }
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={state === "busy"}
        aria-busy={state === "busy" || undefined}
        className={`pressable flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium disabled:opacity-60 ${state === "done" ? "border-positive/60 bg-primary/10" : "border-dashed bg-secondary/30 hover:border-muted-foreground/50"}`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${state === "done" ? "bg-positive text-background" : "bg-secondary text-muted-foreground"}`}>
          {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : state === "done" ? <FileCheck2 className="h-4 w-4" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        </span>
        <span className="flex-1">{state === "done" ? `${label} uploaded` : label}</span>
      </button>
      {error ? <p role="alert" className="text-footnote text-destructive">{error}</p> : null}
    </div>
  );
}

export function VerificationForm({ vendorId, isClaim }: { vendorId: string; isClaim: boolean }) {
  const router = useRouter();
  const [businessDocPath, setBusinessDocPath] = useState<string | null>(null);
  const [idDocPath, setIdDocPath] = useState<string | null>(null);
  const [socialProofUrl, setSocial] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; message?: string }>({});

  async function submit() {
    setBusy(true);
    const res = await submitVerificationAction({ vendorId, businessDocPath, idDocPath, socialProofUrl: socialProofUrl || null, note: note || null });
    setBusy(false);
    if (!res.ok) return setResult({ error: res.error });
    setResult({ message: "Thanks — we'll review your documents and email you. Documents are deleted 30 days after our decision." });
    router.refresh();
  }

  if (result.message) return <FormAlert state={result} />;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Documents are stored privately, seen only by our review team, and deleted 30 days after a decision.
      </p>
      <div className="space-y-3">
        <DocUpload vendorId={vendorId} label="Business document (CAC certificate, utility bill…)" testId="doc-business" onUploaded={setBusinessDocPath} />
        <DocUpload vendorId={vendorId} label={isClaim ? "Photo ID (required)" : "Photo ID"} testId="doc-id" onUploaded={setIdDocPath} />
      </div>
      <Field id="social" label="Venue's official Instagram or website" hint="Helps us confirm you represent the venue.">
        <Input id="social" value={socialProofUrl} onChange={(e) => setSocial(e.target.value)} inputMode="url" placeholder="instagram.com/yourvenue" />
      </Field>
      <Field id="note" label="Anything else we should know?">
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} />
      </Field>
      {result.error ? <FormAlert state={result} /> : null}
      <Button type="button" size="lg" className="w-full" onClick={submit} loading={busy}>
        {busy ? "Submitting…" : isClaim ? "Submit claim" : "Request verification"}
      </Button>
    </div>
  );
}
