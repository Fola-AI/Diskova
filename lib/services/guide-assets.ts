import { nanoid } from "nanoid";

import { getAdminSupabase } from "@/lib/admin-db/client";
import { ImageRejectedError, processImage } from "@/lib/media/image";
import { downloadIncoming, removeIncoming, UploadError } from "@/lib/media/uploads";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/guide-assets");

export class GuideAssetError extends Error {}

/** ONE CMS cover image → guides bucket (public). Caller has checked admin role + aal2. */
export async function processGuideCover(incomingPath: string): Promise<string> {
  try {
    const image = await processImage(await downloadIncoming(incomingPath));
    const path = `covers/${nanoid(16)}.webp`;
    const storage = getAdminSupabase().storage.from("guides");
    const { error } = await storage.upload(path, image.data, { contentType: "image/webp", cacheControl: "31536000" });
    if (error) throw new GuideAssetError("Couldn't save the image.");
    return storage.getPublicUrl(path).data.publicUrl;
  } catch (err) {
    if (err instanceof ImageRejectedError || err instanceof UploadError) throw new GuideAssetError(err.message);
    throw err;
  } finally {
    await removeIncoming(incomingPath).catch(() => undefined);
  }
}
