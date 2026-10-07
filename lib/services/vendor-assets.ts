import { nanoid } from "nanoid";

import type { SessionContext } from "@/lib/auth/guards";
import { memberRoleAtLeast } from "@/lib/auth/roles";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { ImageRejectedError, processImage } from "@/lib/media/image";
import { downloadIncoming, putPublicWebp, removeIncoming, UploadError, VENDOR_ASSETS_BUCKET } from "@/lib/media/uploads";
import { moderateImage } from "@/lib/moderation/image";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/vendor-assets");

export type VendorAssetKind = "cover" | "logo" | "gallery";
export const MAX_GALLERY = 12;

export interface GalleryItem {
  url: string;
  path: string;
  width: number;
  height: number;
  blurhash: string;
}

export class VendorAssetError extends Error {}

export async function assertVendorManager(session: SessionContext, vendorId: string): Promise<void> {
  const { data } = await session.supabase
    .from("vendor_members")
    .select("role, accepted_at")
    .eq("vendor_id", vendorId)
    .eq("profile_id", session.user.id)
    .maybeSingle();
  if (!data?.accepted_at || !memberRoleAtLeast(data.role, "manager")) {
    throw new VendorAssetError("Only owners and managers can change venue photos.");
  }
}

function assetPathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${VENDOR_ASSETS_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

/** Process ONE vendor photo (cover / logo / gallery) and attach it to the vendor (§7.6). */
export async function processVendorAsset(
  session: SessionContext,
  vendorId: string,
  kind: VendorAssetKind,
  incomingPath: string,
): Promise<{ url: string }> {
  try {
    await assertVendorManager(session, vendorId);
    const { data: vendor } = await session.supabase
      .from("vendors")
      .select("cover_image_url, logo_url, gallery")
      .eq("id", vendorId)
      .single();
    if (!vendor) throw new VendorAssetError("Venue not found.");
    const gallery = (Array.isArray(vendor.gallery) ? vendor.gallery : []) as unknown as GalleryItem[];
    if (kind === "gallery" && gallery.length >= MAX_GALLERY) {
      throw new VendorAssetError(`You can add up to ${MAX_GALLERY} gallery photos.`);
    }

    const original = await downloadIncoming(incomingPath);
    const image = await processImage(original, kind === "logo" ? { square: 512 } : { maxEdge: kind === "cover" ? 2000 : 1600 });
    const moderation = await moderateImage(image.data);
    if (moderation.decision === "auto_block") throw new VendorAssetError("That photo can't be used.");

    const path = `${vendorId}/${kind}/${nanoid(12)}.webp`;
    const url = await putPublicWebp(path, image.data, VENDOR_ASSETS_BUCKET);

    let update: { cover_image_url?: string; logo_url?: string; gallery?: GalleryItem[] };
    let stale: string | null = null;
    if (kind === "cover") {
      update = { cover_image_url: url };
      stale = assetPathFromUrl(vendor.cover_image_url);
    } else if (kind === "logo") {
      update = { logo_url: url };
      stale = assetPathFromUrl(vendor.logo_url);
    } else {
      update = { gallery: [...gallery, { url, path, width: image.width, height: image.height, blurhash: image.blurhash }] };
    }
    const { error } = await session.supabase.from("vendors").update(update as never).eq("id", vendorId);
    if (error) throw new VendorAssetError("Couldn't save the photo to your listing.");
    if (stale) await getAdminSupabase().storage.from(VENDOR_ASSETS_BUCKET).remove([stale]);
    return { url };
  } catch (err) {
    if (err instanceof ImageRejectedError || err instanceof UploadError) throw new VendorAssetError(err.message);
    throw err;
  } finally {
    await removeIncoming(incomingPath).catch(() => undefined);
  }
}

export async function removeGalleryPhoto(session: SessionContext, vendorId: string, path: string): Promise<void> {
  await assertVendorManager(session, vendorId);
  const { data: vendor } = await session.supabase.from("vendors").select("gallery").eq("id", vendorId).single();
  const gallery = ((vendor?.gallery ?? []) as unknown as GalleryItem[]).filter((g) => g.path !== path);
  const { error } = await session.supabase.from("vendors").update({ gallery: gallery as never }).eq("id", vendorId);
  if (error) throw new VendorAssetError("Couldn't remove the photo.");
  if (path.startsWith(`${vendorId}/`)) await getAdminSupabase().storage.from(VENDOR_ASSETS_BUCKET).remove([path]);
}
