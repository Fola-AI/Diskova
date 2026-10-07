import { describe, expect, it } from "vitest";

import { ISSUE_REPORT_CONFIRMATION } from "@/lib/safety/copy";

import { listSourceFiles, read, rel } from "../helpers/source-files";

describe("safety copy (§10)", () => {
  it("uses the PRD confirmation text verbatim", () => {
    expect(ISSUE_REPORT_CONFIRMATION).toBe(
      "Thank you. Our team reviews every report. This is not an emergency service — if you are in danger call 112.",
    );
  });

  it("no public incident feed or map of reports exists", () => {
    const routes = listSourceFiles(["app"], [".tsx", ".ts"]).map(rel);
    expect(routes.filter((r) => /incident|issues-map|reports-map/i.test(r))).toEqual([]);
    // Issue reports are only ever read through the service-role RPC in admin code (pages + admin services).
    const readers = listSourceFiles(["app", "components", "lib"], [".ts", ".tsx"]).filter((f) => read(f).includes("admin_list_issue_reports")).map(rel).filter((r) => r !== "lib/db/types.ts");
    expect(readers.filter((r) => !r.startsWith("app/admin/") && !r.startsWith("lib/services/admin/"))).toEqual([]);
  });
});
