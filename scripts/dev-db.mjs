// DEV database helper: push migrations, load the seed, generate types.
// Usage (env loaded by dotenv-cli from .env.local): node scripts/dev-db.mjs push|seed|types
// Guard: refuses to run unless SUPABASE_DB_URL points at SUPABASE_PROJECT_REF (the DEV project).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const { SUPABASE_DB_URL: dbUrl, SUPABASE_PROJECT_REF: ref } = process.env;
const command = process.argv[2];

function fail(message) {
  console.error(`[dev-db] ${message}`);
  process.exit(1);
}

if (!dbUrl || !ref) fail("SUPABASE_DB_URL and SUPABASE_PROJECT_REF must be set (.env.local).");
let user;
try {
  user = decodeURIComponent(new URL(dbUrl).username);
} catch {
  fail("SUPABASE_DB_URL is not a valid URL.");
}
if (!user.endsWith(`.${ref}`) && !dbUrl.includes(ref)) {
  fail(`SUPABASE_DB_URL does not belong to project ${ref}. Refusing to touch it.`);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (res.status !== 0) process.exit(res.status ?? 1);
  return res;
}

switch (command) {
  case "push":
    run("npx", ["supabase", "db", "push", "--db-url", dbUrl, "--yes"]);
    break;
  case "seed":
    run("psql", [dbUrl, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", "supabase/seed/seed.sql"]);
    console.log("[dev-db] seed loaded");
    break;
  case "types": {
    const res = spawnSync(
      "npx",
      ["supabase", "gen", "types", "typescript", "--db-url", dbUrl, "--schema", "public"],
      { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
    );
    if (res.status !== 0) {
      process.stderr.write(res.stderr ?? "");
      process.exit(res.status ?? 1);
    }
    writeFileSync("lib/db/types.ts", res.stdout);
    console.log("[dev-db] wrote lib/db/types.ts");
    break;
  }
  default:
    fail("usage: node scripts/dev-db.mjs push|seed|types");
}
