import { moderateImageScores, type Scores } from "@/lib/moderation/openai";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/moderation/image");

export interface ModerationResult {
  /** Category scores (0–1). Null when moderation was unavailable. */
  scores: Scores | null;
  /** False when the provider could not be reached — callers must fail safe (flag for review). */
  available: boolean;
  blocklistHit?: string | null;
}

/** Image moderation via OpenAI omni-moderation (§8.5 step 1). */
export async function moderateImage(image: Buffer): Promise<ModerationResult> {
  const scores = await moderateImageScores(image);
  return { scores, available: scores !== null };
}
