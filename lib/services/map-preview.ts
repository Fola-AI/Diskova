import sharp from "sharp";

import { MAPBOX_TOKEN, SITE_URL } from "@/lib/config";
import { staticMapUrl } from "@/lib/directory/links";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/map-preview");

export const MAP_PREVIEW_SIZE = { width: 640, height: 280 } as const;

/**
 * City map preview (the LCP image on city pages) as a small WebP. Mapbox's Static Images API only
 * returns PNG (~55 KB); re-encoding gives ~10 KB and lets the CDN cache it on our own origin.
 * The PROD Mapbox token is URL-restricted, so the server request carries our site as Referer.
 */
export async function renderCityMapPreview(center: { lat: number; lng: number }): Promise<Buffer | null> {
  return renderMapPreview(center, { zoom: 11, retina: false });
}

/** Venue preview: pinned, zoomed in, @2x for sharpness (still ~25 KB as WebP vs ~70 KB PNG). */
export async function renderVendorMapPreview(center: { lat: number; lng: number }): Promise<Buffer | null> {
  return renderMapPreview(center, { zoom: 15, pin: true, retina: true });
}

async function renderMapPreview(center: { lat: number; lng: number }, opts: { zoom: number; pin?: boolean; retina: boolean }): Promise<Buffer | null> {
  const url = staticMapUrl(MAPBOX_TOKEN, center, { ...opts, ...MAP_PREVIEW_SIZE });
  if (!url) return null;
  const res = await fetch(url, { headers: { Referer: `${SITE_URL}/` }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const png = Buffer.from(await res.arrayBuffer());
  return sharp(png).webp({ quality: 68, effort: 4 }).toBuffer();
}
