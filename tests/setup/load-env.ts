// Loads .env.local for tests that talk to the DEV Supabase project (tests/rls/*).
// Minimal KEY=VALUE parser (no extra dependency). Never overrides variables already set.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const file = path.resolve(process.cwd(), ".env.local");
if (existsSync(file)) {
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
