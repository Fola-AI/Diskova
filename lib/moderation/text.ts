import { assertServerOnly } from "@/lib/server-only";
import type { ModerationResult } from "@/lib/moderation/image";

assertServerOnly("lib/moderation/text");

/**
 * Text moderation. STUB until Stage L8 wires OpenAI `omni-moderation-latest` + the blocklist:
 * returns auto_pass with no scores. Callers already pass the result through decidePost().
 */
export async function moderateText(_text: string | null | undefined): Promise<ModerationResult> {
  return { decision: "auto_pass", scores: null };
}

export function maxScore(...results: ModerationResult[]): number {
  let max = 0;
  for (const r of results) for (const v of Object.values(r.scores ?? {})) max = Math.max(max, v);
  return max;
}
