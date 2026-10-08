import { describe, expect, it } from "vitest";

import { parseCsv } from "@/lib/content/csv";
import { parseFrontmatter } from "@/lib/content/frontmatter";
import { parseHoursSyntax } from "@/lib/content/hours-syntax";

describe("content parsers (L15)", () => {
  it("front matter: strings, quoted strings, lists, booleans, numbers; body after the fence", () => {
    const { data, body } = parseFrontmatter('---\ntitle: "Hello: world"\ntags: [a, "b, c"]\nfeatured: true\norder: 3\n# comment\n---\n\nBody **here**\n');
    expect(data).toEqual({ title: "Hello: world", tags: ["a", "b, c"], featured: true, order: 3 });
    expect(body).toBe("Body **here**\n");
    expect(parseFrontmatter("no front matter").data).toEqual({});
    expect(() => parseFrontmatter("---\ntitle: x\n")).toThrow(/never closed/);
    expect(() => parseFrontmatter("---\nnot valid\n---\n")).toThrow(/line 2/);
  });

  it("CSV: quotes, embedded commas/newlines, doubled quotes, CRLF, line numbers", () => {
    const rows = parseCsv('name,note\r\n"A, B","said ""hi"""\r\nC,"line1\nline2"\n\nD,\n');
    expect(rows.map((r) => r.row)).toEqual([{ name: "A, B", note: 'said "hi"' }, { name: "C", note: "line1\nline2" }, { name: "D", note: "" }]);
    expect(rows.map((r) => r.line)).toEqual([2, 3, 6]);
    expect(() => parseCsv('a\n"open')).toThrow(/unterminated/);
  });

  it("hours: ranges, lists, daily, closed, overnight, multiple intervals", () => {
    expect(parseHoursSyntax("mon-wed 18:00-02:00; fri,sat 12:00-14:00, 18:00-04:00; sun closed")).toEqual({
      mon: [["18:00", "02:00"]], tue: [["18:00", "02:00"]], wed: [["18:00", "02:00"]],
      fri: [["12:00", "14:00"], ["18:00", "04:00"]], sat: [["12:00", "14:00"], ["18:00", "04:00"]],
    });
    expect(Object.keys(parseHoursSyntax("daily 09:00-17:00"))).toHaveLength(7);
    expect(parseHoursSyntax("fri-mon 20:00-03:00")).toMatchObject({ fri: [["20:00", "03:00"]], sun: [["20:00", "03:00"]], mon: [["20:00", "03:00"]] });
    expect(parseHoursSyntax("")).toEqual({});
    expect(() => parseHoursSyntax("funday 10:00-12:00")).toThrow(/unknown day/);
    expect(() => parseHoursSyntax("mon 25:00-02:00")).toThrow(/bad time/);
  });
});
