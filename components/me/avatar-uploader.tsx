"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createAvatarUpload } from "@/app/(user)/me/settings/actions";
import { Avatar } from "@/components/me/avatar";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/db/client";

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUploader({ url, name }: { url: string | null; name: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(url);

  async function onFile(file: File) {
    if (!ACCEPT.includes(file.type)) return toast.error("Please choose a JPEG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return toast.error("Images must be 5 MB or smaller.");
    setBusy(true);
    try {
      const upload = await createAvatarUpload({ mime: file.type, size: file.size });
      if ("error" in upload) throw new Error(upload.error);
      const { error } = await getBrowserSupabase()
        .storage.from("media-incoming")
        .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type });
      if (error) throw new Error("Upload failed. Please check your connection and try again.");
      const res = await fetch("/api/media/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: upload.path, purpose: "avatar" }),
      });
      const body = (await res.json()) as { avatarUrl?: string; error?: string };
      if (!res.ok || !body.avatarUrl) throw new Error(body.error ?? "We couldn't process that image.");
      setPreview(body.avatarUrl);
      toast.success("Profile photo updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <label htmlFor="avatar-file" className="pressable relative shrink-0 cursor-pointer rounded-full" aria-hidden>
        <Avatar url={preview} name={name} size={80} className={busy ? "opacity-60" : undefined} />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </span>
      </label>
      <div className="space-y-1.5">
        <input
          ref={input}
          type="file"
          accept={ACCEPT.join(",")}
          className="sr-only"
          id="avatar-file"
          aria-label="Change profile photo"
          aria-describedby="avatar-help"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
        <Button type="button" variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>
          {busy ? null : <Camera aria-hidden />}
          {busy ? "Uploading…" : "Change photo"}
        </Button>
        <p id="avatar-help" className="text-footnote text-muted-foreground">JPEG, PNG or WebP, up to 5 MB. Location data is removed.</p>
        <span className="sr-only" aria-live="polite">{busy ? "Uploading photo" : ""}</span>
      </div>
    </div>
  );
}
