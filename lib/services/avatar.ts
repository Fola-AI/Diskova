import { nanoid } from "nanoid";

import { getAdminSupabase } from "@/lib/admin-db/client";
import { ImageRejectedError, processImage } from "@/lib/media/image";
import { downloadIncoming, MEDIA_BUCKET, putPublicWebp, removeIncoming, UploadError } from "@/lib/media/uploads";
import { getPlatformSettings } from "@/lib/admin-db/settings";
import { moderateImage } from "@/lib/moderation/image";
import { maxScore } from "@/lib/moderation/text";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/avatar");

export class AvatarError extends Error {}

/**
 * Process ONE uploaded avatar (§7.6): download from media-incoming, re-encode (512px square WebP,
 * metadata stripped), moderate, publish to media/avatars/{uid}/…, delete the incoming object and any
 * previous avatar files. Returns the public URL; the caller saves it on the profile.
 */
export async function processAvatar(userId: string, incomingPath: string): Promise<string> {
  try {
    const original = await downloadIncoming(incomingPath);
    const image = await processImage(original, { square: 512 });
    const moderation = await moderateImage(image.data);
    if (maxScore(moderation) >= Number((await getPlatformSettings()).moderation_auto_block_threshold)) {
      throw new AvatarError("That image can't be used as a profile photo.");
    }

    const folder = `avatars/${userId}`;
    const fileName = `${nanoid(12)}.webp`;
    const url = await putPublicWebp(`${folder}/${fileName}`, image.data);

    // Remove older avatars for this user (keep only the new one).
    const storage = getAdminSupabase().storage.from(MEDIA_BUCKET);
    const { data: existing } = await storage.list(folder, { limit: 100 });
    const stale = (existing ?? []).filter((o) => o.name !== fileName).map((o) => `${folder}/${o.name}`);
    if (stale.length) await storage.remove(stale);
    return url;
  } catch (err) {
    if (err instanceof ImageRejectedError || err instanceof UploadError) throw new AvatarError(err.message);
    throw err;
  } finally {
    await removeIncoming(incomingPath).catch(() => undefined);
  }
}
