import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { computeDHash, hammingDistance, ImageRejectedError, processImage } from "@/lib/media/image";

async function jpegWithExif(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 11, g: 122, b: 59 } } })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { Copyright: "secret-gps-test", Artist: "Ada" } } })
    .toBuffer();
}

describe("media pipeline: processImage (§7.6)", () => {
  it("re-encodes to WebP, caps the long edge at 2000px and strips all metadata", async () => {
    const input = await jpegWithExif(3000, 1500);
    const before = await sharp(input).metadata();
    expect(before.exif).toBeDefined();

    const out = await processImage(input);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(2000);
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(out.data.includes(Buffer.from("secret-gps-test"))).toBe(false);
    // EXIF orientation 6 (rotate 90°) was applied before stripping: landscape → portrait
    expect(out.height).toBeGreaterThan(out.width);
  });

  it("never upscales small images", async () => {
    const out = await processImage(await jpegWithExif(400, 300));
    expect(Math.max(out.width, out.height)).toBe(400);
  });

  it("produces a blurhash and a 64-bit dHash", async () => {
    const out = await processImage(await jpegWithExif(800, 600));
    expect(out.blurhash.length).toBeGreaterThan(6);
    expect(out.phash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("square-crops avatars", async () => {
    const out = await processImage(await jpegWithExif(1200, 800), { square: 512 });
    expect([out.width, out.height]).toEqual([512, 512]);
  });

  it("rejects non-images and oversize input", async () => {
    await expect(processImage(Buffer.from("not an image"))).rejects.toBeInstanceOf(ImageRejectedError);
    await expect(processImage(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toBeInstanceOf(ImageRejectedError);
  });

  it("dHash: identical images match, different images differ", async () => {
    const a = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#000" } })
      .composite([{ input: Buffer.from('<svg width="32" height="64"><rect width="32" height="64" fill="#fff"/></svg>'), left: 0, top: 0 }])
      .png()
      .toBuffer();
    const b = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#000" } })
      .composite([{ input: Buffer.from('<svg width="64" height="32"><rect width="64" height="32" fill="#fff"/></svg>'), left: 0, top: 0 }])
      .png()
      .toBuffer();
    const ha = await computeDHash(a);
    expect(hammingDistance(ha, await computeDHash(a))).toBe(0);
    expect(hammingDistance(ha, await computeDHash(b))).toBeGreaterThan(0);
  });
});
