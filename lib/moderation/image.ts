import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/moderation/image");

export type ModerationDecision = "auto_pass" | "auto_flag" | "auto_block";

export interface ModerationResult {
  decision: ModerationDecision;
  /** Raw category scores from the moderation provider (null while stubbed). */
  scores: Record<string, number> | null;
}

/**
 * Image moderation. STUB until Stage L8 wires OpenAI `omni-moderation-latest` (PRD §8.5):
 * always auto_pass. Callers already branch on the decision so L8 only replaces this body.
 */
export async function moderateImage(_image: Buffer): Promise<ModerationResult> {
  return { decision: "auto_pass", scores: null };
}
