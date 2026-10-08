import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "@/lib/admin/csv";

describe("CSV export", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell(null)).toBe("");
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
  });
  it("neutralises spreadsheet formula injection", () => {
    for (const v of ["=HYPERLINK(\"x\")", "+1", "-2", "@SUM(A1)"]) expect(csvCell(v).replace(/^"|"$/g, "")).toMatch(/^'/);
  });
  it("builds a CRLF document with a header row", () => {
    expect(toCsv([{ a: 1, b: "x" }, { a: 2, b: "y" }])).toBe("a,b\r\n1,x\r\n2,y\r\n");
  });
});
