/**
 * §8.5 publication decision for a post. Pure function — unit-tested; the moderation provider
 * (stubbed until L8) supplies `maxScore`.
 *
 *  1. maxScore ≥ autoBlockThreshold        → hidden, auto_block (queue P1 via trigger)
 *  2. hold applies (media from new / low-trust account, or any video) → pending + hold_reason (queue P2)
 *  3. maxScore ≥ autoFlagThreshold         → published, auto_flag (publish-then-review, queue P2)
 *  4. otherwise                            → published, auto_pass
 * Text-only posts and pulses never hold.
 */
export type PostStatus = "pending" | "published" | "hidden";
export type HoldReason = "none" | "media_new_account" | "media_low_trust" | "video";
export type Decision = "auto_pass" | "auto_flag" | "auto_block";

export interface ModerationSettings {
  autoBlockThreshold: number;
  autoFlagThreshold: number;
  holdTrustBelow: number;
  holdAccountAgeDays: number;
}

export interface DecideInput {
  kind: "checkin" | "pulse" | "update" | "official";
  hasImage: boolean;
  hasVideo: boolean;
  accountAgeDays: number;
  trustScore: number;
  maxScore: number;
  settings: ModerationSettings;
}

export interface DecideResult {
  status: PostStatus;
  holdReason: HoldReason;
  decision: Decision;
}

export function holdReasonFor(input: Pick<DecideInput, "kind" | "hasImage" | "hasVideo" | "accountAgeDays" | "trustScore" | "settings">): HoldReason {
  if (input.kind === "pulse") return "none";
  if (input.hasVideo) return "video";
  if (!input.hasImage) return "none";
  if (input.accountAgeDays < input.settings.holdAccountAgeDays) return "media_new_account";
  if (input.trustScore < input.settings.holdTrustBelow) return "media_low_trust";
  return "none";
}

export function decidePost(input: DecideInput): DecideResult {
  const { settings, maxScore } = input;
  if (maxScore >= settings.autoBlockThreshold) {
    return { status: "hidden", holdReason: "none", decision: "auto_block" };
  }
  const decision: Decision = maxScore >= settings.autoFlagThreshold ? "auto_flag" : "auto_pass";
  const holdReason = holdReasonFor(input);
  if (holdReason !== "none") return { status: "pending", holdReason, decision };
  return { status: "published", holdReason: "none", decision };
}
