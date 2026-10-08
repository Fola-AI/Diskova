import { describe, expect, it } from "vitest";

import { decidePost, type DecideInput } from "@/lib/moderation/decide";

const settings = { autoBlockThreshold: 0.85, autoFlagThreshold: 0.5, holdTrustBelow: 50, holdAccountAgeDays: 7 };
const base: DecideInput = {
  kind: "checkin",
  hasImage: false,
  hasVideo: false,
  accountAgeDays: 30,
  trustScore: 50,
  maxScore: 0.01,
  settings,
};

describe("decidePost (§8.5)", () => {
  it("auto-passes clean text posts", () => {
    expect(decidePost(base)).toEqual({ status: "published", holdReason: "none", decision: "auto_pass" });
  });

  it("auto-blocks at or above the block threshold (hidden), even with a hold", () => {
    expect(decidePost({ ...base, maxScore: 0.85 })).toMatchObject({ status: "hidden", decision: "auto_block" });
    expect(decidePost({ ...base, maxScore: 0.9, hasImage: true, accountAgeDays: 1 }).status).toBe("hidden");
  });

  it("publishes borderline content but flags it for review", () => {
    expect(decidePost({ ...base, maxScore: 0.5 })).toEqual({ status: "published", holdReason: "none", decision: "auto_flag" });
  });

  it("holds photos from new accounts and from low-trust accounts", () => {
    expect(decidePost({ ...base, hasImage: true, accountAgeDays: 6 })).toMatchObject({ status: "pending", holdReason: "media_new_account" });
    expect(decidePost({ ...base, hasImage: true, trustScore: 49 })).toMatchObject({ status: "pending", holdReason: "media_low_trust" });
    expect(decidePost({ ...base, hasImage: true, accountAgeDays: 7, trustScore: 50 }).status).toBe("published");
  });

  it("never holds text-only posts or pulses, always holds video", () => {
    expect(decidePost({ ...base, accountAgeDays: 0, trustScore: 0 }).status).toBe("published");
    expect(decidePost({ ...base, kind: "pulse", hasImage: true, accountAgeDays: 0 }).status).toBe("published");
    expect(decidePost({ ...base, hasVideo: true })).toMatchObject({ status: "pending", holdReason: "video" });
  });
});
