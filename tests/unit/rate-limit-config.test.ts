import { describe, expect, it } from "vitest";

import { LIMITS } from "@/lib/ratelimit";

/** PRD §7.5 — the numbers are part of the spec; changing them must be deliberate. */
describe("rate limit configuration matches PRD §7.5", () => {
  it.each([
    ["signupIp", 100, "1 h"],
    ["loginEmail", 20, "15 m"],
    ["loginIp", 300, "15 m"],
    ["postUser", 6, "1 h"],
    ["postIp", 600, "1 h"],
    ["pulseUser", 20, "1 h"],
    ["pulseUserVendor", 2, "30 m"],
    ["reportUser", 10, "1 h"],
    ["issueReportUser", 5, "1 h"],
    ["issueReportIp", 50, "1 h"],
    ["mediaUser", 12, "1 h"],
    ["liveIp", 120, "1 m"],
    ["agentKey", 120, "1 m"],
  ] as const)("%s = %i per %s", (name, tokens, window) => {
    expect(LIMITS[name]).toEqual({ tokens, window });
  });

  it("IP limits are always at least 10× the matching per-user limit (carrier-grade NAT)", () => {
    expect(LIMITS.postIp.tokens).toBeGreaterThanOrEqual(LIMITS.postUser.tokens * 10);
    expect(LIMITS.issueReportIp.tokens).toBeGreaterThanOrEqual(LIMITS.issueReportUser.tokens * 10);
    expect(LIMITS.loginIp.tokens).toBeGreaterThanOrEqual(LIMITS.loginEmail.tokens * 10);
  });
});
