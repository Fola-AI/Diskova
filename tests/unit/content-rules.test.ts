import { describe, expect, it } from "vitest";

import { listSourceFiles, read, rel } from "../helpers/source-files";

const PRODUCT_DIRS = [
  "app",
  "components",
  "lib",
  "hooks",
  "content",
  "supabase",
  "emails",
  "public/manifest.json",
];
const EXTS = [".ts", ".tsx", ".sql", ".md", ".mdx", ".json", ".html"];

// Built from parts so this file itself never contains the banned phrases verbatim.
const BANNED: RegExp[] = [
  new RegExp(["detty", "december"].join("\\s*"), "i"),
  new RegExp(["authorities", "will", "(?:act|respond|take action|intervene)"].join("\\s+"), "i"),
  new RegExp(["police", "will", "(?:act|respond|take action|intervene)"].join("\\s+"), "i"),
  new RegExp(
    ["we", "will", "(?:alert|notify|inform)", "the", "(?:authorities|police)"].join("\\s+"),
    "i",
  ),
];

describe("content rules (CLAUDE.md)", () => {
  const files = listSourceFiles(PRODUCT_DIRS, EXTS);

  it("never uses banned season naming or authority-action promises", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = read(f);
      for (const re of BANNED) if (re.test(src)) offenders.push(`${rel(f)} ~ ${re.source}`);
    }
    expect(offenders).toEqual([]);
  });

  it("never hard-codes the brand name outside lib/config.ts", () => {
    const brand = (process.env.NEXT_PUBLIC_BRAND_NAME || "Diskova").trim();
    const re = new RegExp(`\\b${brand}\\b`, "i");
    const offenders = files
      .filter((f) => rel(f) !== "lib/config.ts")
      .filter((f) => re.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
