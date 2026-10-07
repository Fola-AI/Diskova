import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(__dirname, "../..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "playwright-report",
  "test-results",
  ".temp",
]);

/** Recursively list files under the given repo-relative dirs matching the extensions. */
export function listSourceFiles(dirs: string[], exts: string[]): string[] {
  const out: string[] = [];
  const walk = (abs: string) => {
    for (const entry of readdirSync(abs)) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = path.join(abs, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (exts.some((e) => entry.endsWith(e))) out.push(full);
    }
  };
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    if (existsSync(abs)) {
      if (statSync(abs).isDirectory()) walk(abs);
      else out.push(abs);
    }
  }
  return out;
}

export function rel(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

export function read(file: string): string {
  return readFileSync(file, "utf8");
}

export function isClientFile(source: string): boolean {
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(source);
}
