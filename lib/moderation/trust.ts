/** §8.5 step 6: human moderation outcomes adjust the author's trust score (0–100). */
export const TRUST_DELTA = { pass: 2, remove: -10, removeSevere: -25 } as const;
export const SEVERE_REASONS = ["fake", "rival_sabotage"] as const;

export const MODERATION_ACTIONS = [
  "approve",
  "approve_verify",
  "remove",
  "remove_warn",
  "remove_suspend",
  "remove_ban",
  "shadowban",
  "dismiss",
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export function trustAfter(current: number, action: ModerationAction, category?: string | null): number {
  let delta = 0;
  if (action === "approve" || action === "approve_verify") delta = TRUST_DELTA.pass;
  else if (action.startsWith("remove")) {
    delta = category && (SEVERE_REASONS as readonly string[]).includes(category) ? TRUST_DELTA.removeSevere : TRUST_DELTA.remove;
  }
  return Math.max(0, Math.min(100, current + delta));
}
