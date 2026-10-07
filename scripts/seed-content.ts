/**
 * Load Fola's real content from /content into the database (PRD L15). See content/README.md.
 *
 *   npm run content:check                              # validate everything, write nothing (DEV env)
 *   npm run content:load -- --confirm=<project-ref>    # write to the project in .env.local (DEV)
 *   npx dotenv -e .env.production.local -- npx tsx scripts/seed-content.ts --confirm=<PROD_REF>   # PROD (Fola)
 *
 * Flags: --dry-run · --overwrite (replace existing guides / safety entries) · --dir=content/_examples
 * Writes need --confirm=<ref> matching the target project, so the wrong .env can't load content by accident.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { loadContent, type ContentFile } from "../lib/services/content-loader";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  return hit ? (hit.includes("=") ? hit.split("=").slice(1).join("=") : "true") : undefined;
}

function walk(dir: string, root: string, out: ContentFile[]) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "images") walk(full, root, out);
    } else if (/\.(md|csv)$/.test(name) && name.toLowerCase() !== "readme.md") {
      out.push({ path: relative(root, full).split(sep).join("/"), text: readFileSync(full, "utf8") });
    }
  }
}

async function main(): Promise<void> {
  const dir = arg("dir") ?? "content";
  const dryRun = arg("dry-run") === "true" || arg("confirm") === undefined;
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://unset").host.split(".")[0];
  if (!existsSync(dir)) throw new Error(`No ${dir}/ folder.`);
  if (!dryRun && arg("confirm") !== ref) throw new Error(`Refusing to write: pass --confirm=${ref} to load into project "${ref}".`);

  const files: ContentFile[] = [];
  walk(dir, dir, files);
  const imagesDir = join(dir, "images");
  console.log(`${dryRun ? "Checking" : "Loading"} ${files.length} file(s) from ${dir}/ → project ${ref}${dryRun ? " (dry run — nothing is written)" : ""}`);

  const report = await loadContent(
    {
      files,
      async readImage(name) {
        const p = join(imagesDir, name);
        return p.startsWith(imagesDir) && existsSync(p) ? readFileSync(p) : null;
      },
    },
    { dryRun, overwrite: arg("overwrite") === "true", includeExamples: dir.includes("_examples") },
  );

  const show = (label: string, m: Record<string, number>) => Object.keys(m).length && console.log(`${label}: ${Object.entries(m).map(([k, n]) => `${n} ${k}`).join(", ")}`);
  show(dryRun ? "Would load" : "Created", report.created);
  show("Updated", report.updated);
  show("Skipped", report.skipped);
  for (const w of report.warnings) console.warn(`warning: ${w}`);
  if (report.errors.length) {
    for (const e of report.errors) console.error(`error: ${e}`);
    console.error(`${report.errors.length} error(s)${dryRun ? "" : " — nothing was written if these were found while checking"}.`);
    process.exit(1);
  }
  if (dryRun && arg("confirm") === undefined) console.log(`All valid. To write: npm run content:load -- --confirm=${ref}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
