import { describe, expect, it } from "vitest";

import { parseFlag, resolveSiteUrl } from "@/lib/config";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and strips trailing slashes", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.io/", VERCEL_URL: "x.vercel.app" }),
    ).toBe("https://example.io");
  });

  it("falls back to https://VERCEL_URL on Vercel Preview", () => {
    expect(resolveSiteUrl({ VERCEL_URL: "diskova-git-develop.vercel.app" })).toBe(
      "https://diskova-git-develop.vercel.app",
    );
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "  ", NEXT_PUBLIC_VERCEL_URL: "p.vercel.app" }),
    ).toBe("https://p.vercel.app");
  });

  it("falls back to localhost", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});

describe("parseFlag", () => {
  it("uses the default when unset or empty", () => {
    expect(parseFlag(undefined, true)).toBe(true);
    expect(parseFlag("", false)).toBe(false);
  });

  it("parses truthy and falsy strings", () => {
    expect(parseFlag("true", false)).toBe(true);
    expect(parseFlag("TRUE", false)).toBe(true);
    expect(parseFlag("1", false)).toBe(true);
    expect(parseFlag("false", true)).toBe(false);
    expect(parseFlag("nope", true)).toBe(false);
  });
});
