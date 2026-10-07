export const CLIENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const CLIENT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type SignedResult = { ok: true; data: { path: string; token: string } } | { ok: false; error: string };

/**
 * Browser side of the pipeline: get a signed URL from a Server Action, upload the raw file into the
 * private incoming bucket, return the incoming path for the ONE-image processing call.
 */
export async function uploadToIncoming(
  file: File,
  getSigned: (mime: string, size: number) => Promise<SignedResult>,
  bucket = "media-incoming",
): Promise<string> {
  const signed = await getSigned(file.type, file.size);
  if (!signed.ok) throw new Error(signed.error);
  // Loaded on demand so public pages don't ship supabase-js until someone actually uploads.
  const { getBrowserSupabase } = await import("@/lib/db/client");
  const { error } = await getBrowserSupabase()
    .storage.from(bucket)
    .uploadToSignedUrl(signed.data.path, signed.data.token, file, { contentType: file.type });
  if (error) throw new Error("Upload failed. Please check your connection and try again.");
  return signed.data.path;
}

export function checkImageFile(file: File): string | null {
  if (!CLIENT_IMAGE_TYPES.includes(file.type)) return "Please choose a JPEG, PNG or WebP image.";
  if (file.size > CLIENT_MAX_IMAGE_BYTES) return "Images must be 5 MB or smaller.";
  return null;
}
