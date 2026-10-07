import { encode } from "blurhash";
import sharp, { type Metadata } from "sharp";

import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/media/image");

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // §7.6
export const MAX_LONG_EDGE = 2000; // CLAUDE.md
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
  blurhash: string;
  /** 64-bit difference hash (hex) for near-duplicate detection. */
  phash: string;
}

export class ImageRejectedError extends Error {}

/**
 * Re-encode one image: honour EXIF orientation, then drop ALL metadata (EXIF/GPS/ICC), resize so the
 * long edge ≤ maxEdge (never upscale), encode WebP q80. Rejects non-images and decompression bombs.
 */
export async function processImage(
  input: Buffer,
  opts: { maxEdge?: number; square?: number } = {},
): Promise<ProcessedImage> {
  if (input.byteLength === 0 || input.byteLength > MAX_UPLOAD_BYTES) {
    throw new ImageRejectedError("Image must be between 1 byte and 5 MB.");
  }
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ImageRejectedError("That file isn't a supported image.");
  }
  if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
    throw new ImageRejectedError("Please upload a JPEG, PNG or WebP image.");
  }

  const maxEdge = opts.maxEdge ?? MAX_LONG_EDGE;
  const pipeline = sharp(input, { limitInputPixels: 50_000_000 }).rotate(); // apply EXIF orientation
  if (opts.square) {
    pipeline.resize({ width: opts.square, height: opts.square, fit: "cover", position: "attention" });
  } else {
    pipeline.resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true });
  }
  // sharp strips metadata unless .withMetadata() is called — we never call it.
  const { data, info } = await pipeline.webp({ quality: 80 }).toBuffer({ resolveWithObject: true });

  const [blurhash, phash] = await Promise.all([computeBlurhash(data), computeDHash(data)]);
  return { data, width: info.width, height: info.height, blurhash, phash };
}

async function computeBlurhash(image: Buffer): Promise<string> {
  const { data, info } = await sharp(image)
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
}

/** dHash: 9×8 greyscale, compare horizontally adjacent pixels → 64 bits. */
export async function computeDHash(image: Buffer): Promise<string> {
  const pixels = await sharp(image).greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      bits += pixels[row * 9 + col] > pixels[row * 9 + col + 1] ? "1" : "0";
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** Hamming distance between two dHashes (0 = identical, ≤ 10 ≈ near-duplicate). */
export function hammingDistance(a: string, b: string): number {
  let distance = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      distance += x & 1;
      x >>= 1;
    }
  }
  return distance;
}
