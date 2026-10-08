// Runs the Playwright smoke project as the last step of `npm run verify`.
// PRD §2.1: Playwright runs from Stage L3 onward; before any smoke specs exist it is skipped
// with a clear message rather than silently passing.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";

const dir = "tests/smoke";
const specs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".spec.ts")) : [];

if (specs.length === 0) {
  console.log("[verify] Playwright smoke: SKIPPED — no smoke specs yet (they start in Stage L3).");
  process.exit(0);
}

// Start from a cold Next.js Data Cache: Supabase GETs are cached on disk (.next/cache/fetch-cache) per
// route revalidate window and survive rebuilds, so a previous run's responses could leak into this one.
if (!process.env.PLAYWRIGHT_BASE_URL) rmSync(`${process.env.NEXT_DIST_DIR || ".next"}/cache/fetch-cache`, { recursive: true, force: true });

console.log(`[verify] Playwright smoke: running ${specs.length} spec file(s)…`);
const result = spawnSync("npx", ["playwright", "test", "--project=smoke"], { stdio: "inherit" });
process.exit(result.status ?? 1);
