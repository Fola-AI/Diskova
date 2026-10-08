import { beforeAll, describe, expect, it } from "vitest";

describe("CMS draft preview tokens", () => {
  beforeAll(() => {
    process.env.TOKEN_ENCRYPTION_KEY ||= "test-key-for-preview-tokens-0123456789";
  });

  it("accepts a fresh token for the same guide only, and expires after an hour", async () => {
    const { createPreviewToken, verifyPreviewToken } = await import("@/lib/content/preview-token");
    const id = "11111111-1111-4111-8111-111111111111";
    const t = createPreviewToken(id, 1_000_000);
    expect(verifyPreviewToken(id, t, 1_000_000 + 59 * 60_000)).toBe(true);
    expect(verifyPreviewToken(id, t, 1_000_000 + 61 * 60_000)).toBe(false);
    expect(verifyPreviewToken("22222222-2222-4222-8222-222222222222", t, 1_000_000)).toBe(false);
    expect(verifyPreviewToken(id, t.replace(/.$/, (c) => (c === "A" ? "B" : "A")), 1_000_000)).toBe(false);
    expect(verifyPreviewToken(id, "garbage", 1_000_000)).toBe(false);
    expect(verifyPreviewToken(id, null)).toBe(false);
  });
});
