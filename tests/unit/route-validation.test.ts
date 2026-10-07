import { describe, expect, it } from "vitest";

import { listSourceFiles, read, rel } from "../helpers/source-files";
import { authCallbackQuery, calendarQuery, slugParam } from "@/lib/validation/routes";

/** §7.4: every Route Handler that reads input validates it with zod. */
describe("route handler input validation", () => {
  const routes = listSourceFiles(["app"], [".ts"]).filter((f) => /\/route\.ts$/.test(f) && !/opengraph-image/.test(f));

  it("every handler that reads params, query or a body uses a zod schema (or a closed allowlist)", () => {
    // Agent API routes hand params/query to lib/services/admin/agent-data, which validates with zod.
    const delegated = (src: string) => /from "@\/lib\/services\/admin\/agent-data"/.test(src);
    // openapi.json reads its own response body (no request input).
    const noInput = new Set(["app/api/agent/v1/openapi.json/route.ts"]);
    const offenders = routes
      .filter((f) => /params|searchParams|\.json\(\)|formData\(\)/.test(read(f)))
      .filter((f) => !/\.(safeParse|parse)\(|EXPORT_TABLES\.find/.test(read(f)) && !delegated(read(f)))
      .map(rel)
      .filter((r) => !noInput.has(r));
    expect(offenders).toEqual([]);
    expect((read("lib/services/admin/agent-data.ts").match(/\.parse\(|pickEnum\(/g) ?? []).length).toBeGreaterThan(10);
  });

  it("slug params reject anything but lowercase slugs", () => {
    expect(slugParam.safeParse("suya-street-corner-lagos").success).toBe(true);
    for (const bad of ["", "../etc", "Lagos", "a b", "x".repeat(200), "slug;drop"]) expect(slugParam.safeParse(bad).success).toBe(false);
  });

  it("unknown query values degrade to defaults instead of erroring", () => {
    expect(calendarQuery.parse({ city: "NOT A SLUG", season: "june" })).toEqual({ city: undefined, season: undefined });
    expect(authCallbackQuery.parse({ type: "admin", code: "x" })).toEqual({ type: undefined, code: undefined, token_hash: undefined, next: undefined });
    expect(authCallbackQuery.parse({ code: "9f1c2b4a-1111-2222-3333-444455556666" }).code).toBe("9f1c2b4a-1111-2222-3333-444455556666");
  });
});
