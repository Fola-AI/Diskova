import { decode, isBlurhashValid } from "blurhash";

/**
 * Blurhash → tiny data URL for next/image `placeholder="blur"` (L14). An 8×8 24-bit BMP is ~250
 * bytes, built synchronously with no extra dependency; next/image scales and blurs it.
 */
const SIZE = 8;
const cache = new Map<string, string>();

function bmp(rgba: Uint8ClampedArray, w: number, h: number): Buffer {
  const rowBytes = Math.ceil((w * 3) / 4) * 4;
  const pixelBytes = rowBytes * h;
  const buf = Buffer.alloc(54 + pixelBytes);
  buf.write("BM", 0, "ascii");
  buf.writeUInt32LE(54 + pixelBytes, 2);
  buf.writeUInt32LE(54, 10); // pixel data offset
  buf.writeUInt32LE(40, 14); // BITMAPINFOHEADER
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22); // positive = bottom-up rows
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(pixelBytes, 34);
  for (let y = 0; y < h; y++) {
    const row = 54 + (h - 1 - y) * rowBytes;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      buf[row + x * 3] = rgba[i + 2]!; // B
      buf[row + x * 3 + 1] = rgba[i + 1]!; // G
      buf[row + x * 3 + 2] = rgba[i]!; // R
    }
  }
  return buf;
}

export function blurDataUrl(hash: string | null | undefined): string | undefined {
  if (!hash) return undefined;
  const hit = cache.get(hash);
  if (hit) return hit;
  if (!isBlurhashValid(hash).result) return undefined;
  const url = `data:image/bmp;base64,${bmp(decode(hash, SIZE, SIZE), SIZE, SIZE).toString("base64")}`;
  if (cache.size > 1000) cache.clear();
  cache.set(hash, url);
  return url;
}
