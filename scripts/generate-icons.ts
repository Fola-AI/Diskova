/**
 * Generates PWA / favicon PNGs from the brand initial. Run: npm run icons
 * Output is committed; re-run only if NEXT_PUBLIC_BRAND_NAME changes.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { BRAND_COLORS, BRAND_NAME } from "../lib/config";

const initial = BRAND_NAME.charAt(0).toUpperCase();

function svg(size: number, padding: number, rounded: boolean): string {
  const radius = rounded ? size * 0.22 : 0;
  const inner = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BRAND_COLORS.background}"/>
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${inner * 0.22}" fill="${BRAND_COLORS.green}"/>
  <circle cx="${padding + inner * 0.78}" cy="${padding + inner * 0.22}" r="${inner * 0.07}" fill="${BRAND_COLORS.gold}"/>
  <text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
    font-weight="700" font-size="${inner * 0.62}" fill="#FFFFFF">${initial}</text>
</svg>`;
}

async function render(file: string, size: number, padding: number, rounded = true): Promise<void> {
  const png = await sharp(Buffer.from(svg(size, padding, rounded)))
    .png()
    .toBuffer();
  await writeFile(file, png);
  console.log(`wrote ${path.relative(process.cwd(), file)} (${size}px)`);
}

async function main(): Promise<void> {
  const root = process.cwd();
  await mkdir(path.join(root, "public/icons"), { recursive: true });
  await render(path.join(root, "public/icons/icon-192.png"), 192, 0, false);
  await render(path.join(root, "public/icons/icon-512.png"), 512, 0, false);
  // Maskable: keep content inside the 80% safe zone.
  await render(path.join(root, "public/icons/icon-maskable-512.png"), 512, 64, false);
  await render(path.join(root, "app/icon.png"), 64, 0, true);
  await render(path.join(root, "app/apple-icon.png"), 180, 0, false);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
