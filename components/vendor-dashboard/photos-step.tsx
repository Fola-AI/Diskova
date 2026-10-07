"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createVendorImageUploadAction, removeGalleryPhotoAction } from "@/app/(vendor)/vendor/actions";
import { Button } from "@/components/ui/button";
import { StepFooter } from "@/components/vendor-dashboard/step-footer";
import { checkImageFile, uploadToIncoming } from "@/lib/media/client-upload";

type Kind = "cover" | "logo" | "gallery";
export interface GalleryItem {
  url: string;
  path: string;
}

function UploadButton({ vendorId, kind, label, disabled }: { vendorId: string; kind: Kind; label: string; disabled?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    const problem = checkImageFile(file);
    if (problem) return toast.error(problem);
    setBusy(true);
    try {
      const path = await uploadToIncoming(file, (mime, size) => createVendorImageUploadAction({ vendorId, mime, size }));
      // ONE image per server invocation (§7.6).
      const res = await fetch("/api/media/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, purpose: `vendor_${kind}`, vendorId }),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "We couldn't process that image.");
      toast.success("Photo added.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        data-testid={`upload-${kind}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />
      <Button type="button" variant="secondary" size="sm" disabled={busy || disabled} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
        {busy ? "Uploading…" : label}
      </Button>
    </>
  );
}

export function PhotosStep({
  vendorId,
  coverUrl,
  logoUrl,
  gallery,
  maxGallery,
  backHref,
  nextHref,
}: {
  vendorId: string;
  coverUrl: string | null;
  logoUrl: string | null;
  gallery: GalleryItem[];
  maxGallery: number;
  backHref: string;
  nextHref: string;
}) {
  const router = useRouter();
  async function remove(path: string) {
    const res = await removeGalleryPhotoAction(vendorId, path);
    if (!res.ok) toast.error(res.error);
    router.refresh();
  }
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Photo-first: venues with a cover photo get far more taps. Location data is removed from every photo.
      </p>
      <section className="space-y-2">
        <h3 className="font-sans text-sm font-semibold tracking-normal">Cover photo</h3>
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border bg-secondary">
          {coverUrl ? <Image src={coverUrl} alt="Cover" fill sizes="(max-width: 640px) 100vw, 600px" className="object-cover" /> : null}
        </div>
        <UploadButton vendorId={vendorId} kind="cover" label={coverUrl ? "Replace cover" : "Add cover photo"} />
      </section>
      <section className="space-y-2">
        <h3 className="font-sans text-sm font-semibold tracking-normal">Logo</h3>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl border bg-secondary">
            {logoUrl ? <Image src={logoUrl} alt="Logo" fill sizes="64px" className="object-cover" /> : null}
          </div>
          <UploadButton vendorId={vendorId} kind="logo" label={logoUrl ? "Replace logo" : "Add logo"} />
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="font-sans text-sm font-semibold tracking-normal">Gallery ({gallery.length}/{maxGallery})</h3>
        {gallery.length ? (
          <ul className="grid grid-cols-3 gap-2">
            {gallery.map((g) => (
              <li key={g.path} className="relative aspect-square overflow-hidden rounded-lg border">
                <Image src={g.url} alt="" fill sizes="33vw" className="object-cover" />
                <button
                  type="button"
                  onClick={() => remove(g.path)}
                  className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <UploadButton vendorId={vendorId} kind="gallery" label="Add gallery photo" disabled={gallery.length >= maxGallery} />
      </section>
      <StepFooter backHref={backHref} nextHref={nextHref} />
    </div>
  );
}
