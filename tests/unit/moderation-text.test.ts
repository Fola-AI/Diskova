import { describe, expect, it } from "vitest";

import { trustAfter } from "@/lib/moderation/trust";
import { blocklistMatch, effectiveScore } from "@/lib/moderation/text";

describe("blocklist (§8.5, admin-managed phrases)", () => {
  it("matches whole words case-insensitively", () => {
    expect(blocklistMatch("Buy CHEAP followers now", ["cheap followers"])).toBe("cheap followers");
    expect(blocklistMatch("scamming", ["scam"])).toBeNull();
    expect(blocklistMatch("total scam!", ["scam"])).toBe("scam");
    expect(blocklistMatch("anything", ["", "  "])).toBeNull();
  });
});

describe("effectiveScore fails safe", () => {
  it("uses the max score when every check ran", () => {
    expect(effectiveScore([{ scores: { a: 0.2 }, available: true }, { scores: { b: 0.7 }, available: true }], 0.5)).toBe(0.7);
  });
  it("raises to the flag threshold when a check could not run", () => {
    expect(effectiveScore([{ scores: { a: 0.1 }, available: true }, { scores: null, available: false }], 0.5)).toBe(0.5);
    expect(effectiveScore([{ scores: null, available: false }], 0.5)).toBe(0.5);
  });
});

describe("trust adjustments (§8.5 step 6)", () => {
  it("+2 for a pass, −10 for a removal, −25 for fake / rival sabotage, clamped 0–100", () => {
    expect(trustAfter(50, "approve")).toBe(52);
    expect(trustAfter(50, "approve_verify")).toBe(52);
    expect(trustAfter(50, "remove")).toBe(40);
    expect(trustAfter(50, "remove_warn", "spam")).toBe(40);
    expect(trustAfter(50, "remove_ban", "fake")).toBe(25);
    expect(trustAfter(50, "remove", "rival_sabotage")).toBe(25);
    expect(trustAfter(5, "remove", "fake")).toBe(0);
    expect(trustAfter(99, "approve")).toBe(100);
    expect(trustAfter(50, "dismiss")).toBe(50);
  });
});
