import { nanoid } from "nanoid";

import { getAdminSupabase } from "@/lib/admin-db/client";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, type AcceptedImageType } from "@/lib/media/image";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/media/uploads");

export const INCOMING_BUCKET = "media-incoming";
export const MEDIA_BUCKET = "media";

const EXT: Record<AcceptedImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export class UploadError extends Error {}

/**
 * Issue a signed upload URL into the private incoming bucket under the user's own folder.
 * The bucket also enforces 5 MB + MIME allow-list server-side.
 */
export async function createIncomingUpload(
  userId: string,
  mime: string,
  size: number,
): Promise<{ path: string; token: string }> {
  if (!ACCEPTED_IMAGE_TYPES.includes(mime as AcceptedImageType)) {
    throw new UploadError("Please choose a JPEG, PNG or WebP image.");
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Images must be 5 MB or smaller.");
  }
  const path = `${userId}/${nanoid(16)}.${EXT[mime as AcceptedImageType]}`;
  const { data, error } = await getAdminSupabase().storage.from(INCOMING_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new UploadError("Couldn't start the upload. Please try again.");
  return { path: data.path, token: data.token };
}

/** The incoming path must sit in the caller's own folder and look like one we issued. */
export function isOwnIncomingPath(userId: string, path: string): boolean {
  return new RegExp(`^${userId}/[A-Za-z0-9_-]{16}\\.(jpg|png|webp)$`).test(path);
}

export async function downloadIncoming(path: string): Promise<Buffer> {
  const { data, error } = await getAdminSupabase().storage.from(INCOMING_BUCKET).download(path);
  if (error || !data) throw new UploadError("Upload not found. Please try again.");
  return Buffer.from(await data.arrayBuffer());
}

export async function removeIncoming(path: string): Promise<void> {
  await getAdminSupabase().storage.from(INCOMING_BUCKET).remove([path]);
}

export async function putPublicWebp(path: string, data: Buffer): Promise<string> {
  const storage = getAdminSupabase().storage.from(MEDIA_BUCKET);
  const { error } = await storage.upload(path, data, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new UploadError("Couldn't save the image. Please try again.");
  return storage.getPublicUrl(path).data.publicUrl;
}
