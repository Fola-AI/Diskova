import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isClientFile, listSourceFiles, read, rel } from "../helpers/source-files";

const CODE_DIRS = ["app", "components", "lib", "hooks", "scripts", "middleware.ts"];
const EXTS = [".ts", ".tsx", ".mts", ".mjs", ".js"];
const SERVER_ONLY_IMPORT =
  /from\s+["'][^"']*(?:admin-db|env\.server)[^"']*["']|import\(\s*["'][^"']*(?:admin-db|env\.server)/;

describe("service-role isolation (PRD §7.2)", () => {
  const files = listSourceFiles(CODE_DIRS, EXTS);

  it("finds source files to check", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("no 'use client' file imports admin-db or env.server", () => {
    const offenders = files
      .filter((f) => isClientFile(read(f)))
      .filter((f) => SERVER_ONLY_IMPORT.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("nothing under /components imports admin-db or env.server", () => {
    const offenders = files
      .filter((f) => rel(f).startsWith("components/"))
      .filter((f) => SERVER_ONLY_IMPORT.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("SUPABASE_SERVICE_ROLE_KEY is only referenced from env.server, admin-db and scripts", () => {
    const allowed = (p: string) =>
      p === "lib/env.server.ts" || p.startsWith("lib/admin-db/") || p.startsWith("scripts/");
    const offenders = files
      .filter((f) => read(f).includes("SUPABASE_SERVICE_ROLE_KEY"))
      .map(rel)
      .filter((p) => !allowed(p));
    expect(offenders).toEqual([]);
  });

  it("no secret is exposed through a NEXT_PUBLIC_ variable", () => {
    const offenders = files
      .filter((f) =>
        /NEXT_PUBLIC_[A-Z_]*(?:SERVICE_ROLE|SECRET|PRIVATE|TOKEN_ENCRYPTION)/.test(read(f)),
      )
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it("admin-db modules carry the runtime server-only guard", () => {
    const adminFiles = files.filter((f) => rel(f).startsWith("lib/admin-db/"));
    expect(adminFiles.length).toBeGreaterThan(0);
    for (const f of adminFiles) {
      expect(read(f), rel(f)).toMatch(/assertServerOnly\(/);
    }
  });
});

describe("built client bundles contain no server secrets (PRD §7.2)", () => {
  const staticDir = join(process.cwd(), ".next", "static");
  const secrets = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.OPENAI_API_KEY,
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.RESEND_API_KEY,
    process.env.CRON_SECRET,
    process.env.TOKEN_ENCRYPTION_KEY,
    process.env.SENTRY_AUTH_TOKEN,
    process.env.GROQ_API_KEY,
  ].filter((s): s is string => Boolean(s && s.length >= 12));
  const run = existsSync(staticDir) ? it : it.skip;

  run("no secret value or sb_secret_ key material appears in any file under .next/static", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(js|css|json|txt|html)$/.test(e.name)) files.push(p);
      }
    };
    walk(staticDir);
    expect(files.length).toBeGreaterThan(10);
    const leaks: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      // supabase-js itself contains the bare prefix ("sb_secret_") in a key-type check; a real key has material after it.
      if (/sb_secret_[A-Za-z0-9_-]{10,}/.test(body)) leaks.push(`${f}: sb_secret_ key`);
      for (const s of secrets) if (body.includes(s)) leaks.push(`${f}: secret value`);
    }
    expect(leaks).toEqual([]);
  });
});
