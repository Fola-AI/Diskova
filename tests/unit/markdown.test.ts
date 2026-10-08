import { describe, expect, it } from "vitest";

import { markdownToHtml, markdownToText, parseBlocks, safeHref, sanitizeHtml } from "@/lib/content/markdown";

describe("markdown renderer (§8.7)", () => {
  it("renders the supported syntax", () => {
    const html = markdownToHtml("# Title\n\nSome **bold**, *italic* and `code`.\n\n- one\n- two\n\n1. a\n2. b\n\n> quoted\n\n---\n\n[site](https://example.com) and [home](/c/lagos)");
    expect(html).toContain("<h2>Title</h2>"); // h1 demoted
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<ol><li>a</li><li>b</li></ol>");
    expect(html).toContain("<blockquote><p>quoted</p></blockquote>");
    expect(html).toContain("<hr>");
    expect(html).toContain('<a href="https://example.com/" rel="nofollow noopener noreferrer" target="_blank">site</a>');
    expect(html).toContain('<a href="/c/lagos">home</a>');
  });

  it("escapes raw HTML and neutralises XSS vectors", () => {
    const attacks = [
      "<script>alert(1)</script>",
      '<img src=x onerror="alert(1)">',
      "[click](javascript:alert(1))",
      "[click](JaVaScRiPt:alert(1))",
      "![x](javascript:alert(1))",
      "[x](data:text/html;base64,PHNjcmlwdD4=)",
      '<a href="javascript:alert(1)">x</a>',
      "[x](//evil.example)",
      '<iframe src="https://evil.example"></iframe>',
      '"><svg onload=alert(1)>',
    ];
    for (const a of attacks) {
      const html = markdownToHtml(a);
      // Escaped text like "&lt;img onerror=…&gt;" is inert; what must never appear is a real tag/attribute.
      expect(html, a).not.toMatch(/<(script|iframe|svg|object|embed)\b/i);
      expect(html, a).not.toMatch(/<[a-z][^>]*\son[a-z]+\s*=/i);
      expect(html, a).not.toMatch(/<[a-z][^>]*\s(href|src)="(javascript:|data:|\/\/)/i);
    }
  });

  it("sanitizer strips anything outside the allowlist", () => {
    expect(sanitizeHtml('<p style="x" onclick="y">ok</p><script>1</script><a href="javascript:x">a</a>')).toBe("<p>ok</p><a>a</a>");
  });

  it("only allows http(s), mailto and same-site links", () => {
    expect(safeHref("https://x.io/a")).toBe("https://x.io/a");
    expect(safeHref("/guides/lagos")).toBe("/guides/lagos");
    expect(safeHref("mailto:hi@x.io")).toBe("mailto:hi@x.io");
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("ftp://x")).toBeNull();
  });

  it("parses custom tags into blocks before any HTML exists", () => {
    const blocks = parseBlocks(
      'Intro\n<VendorCard slug="indigo-tide-lounge-lagos" />\nMiddle\n<Map vendors="a-lagos, b-lagos,BAD SLUG" />\n<PriceTable vendor="a-lagos" />\n<Callout type="tip">Carry **cash**</Callout>\n<VendorCard slug="../etc" />',
    );
    expect(blocks.map((b) => b.type)).toEqual(["markdown", "vendor-card", "markdown", "map", "price-table", "callout", "markdown"]);
    expect(blocks[3]).toEqual({ type: "map", slugs: ["a-lagos", "b-lagos"] });
    expect(blocks[5]).toEqual({ type: "callout", variant: "tip", text: "Carry **cash**" });
    // the malformed tag stays as (escaped) text
    expect(markdownToHtml((blocks[6] as { text: string }).text)).toContain("&lt;VendorCard");
  });

  it("makes plain-text excerpts", () => {
    expect(markdownToText("## Hi\n\nA [link](https://x.io) and **bold** <Callout>x</Callout>", 40)).toBe("Hi A link and bold x");
  });
});
