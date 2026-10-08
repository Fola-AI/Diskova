import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("launch artefacts (L15)", () => {
  it("the PROD-safe reference seed contains no venues; the DEV seed includes it", () => {
    const ref = readFileSync("supabase/seed/reference.sql", "utf8");
    expect(ref).not.toMatch(/insert into public\.vendors/i);
    expect(ref).toMatch(/insert into public\.cities/i);
    expect(readFileSync("supabase/seed/seed.sql", "utf8")).toContain("\\ir reference.sql");
  });

  it("LAUNCH.md covers every step PRD L15 lists, plus known limitations", () => {
    const md = readFileSync("LAUNCH.md", "utf8");
    for (const must of [
      "Environment Variables", "supabase link --project-ref", "db push", "clean checkout", "graphql_public",
      "Custom SMTP", "PITR", "pg_cron", "Resend", "verified", "Mapbox", "usage alert", "Rotate", "Groq",
      "create-super-admin", "TOTP", "Sentry", "alerts", "Vercel Pro", "DNS", "--grep @readonly", "Known limitations",
    ]) expect(md, must).toContain(must);
  });

  it("the content folder documents its format and ships only examples", () => {
    expect(readFileSync("content/README.md", "utf8")).toContain("seed-content.ts");
    expect(readFileSync("scripts/promote-migrations.md", "utf8")).toContain("reference.sql");
  });
});
