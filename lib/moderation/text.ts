import type { ModerationResult } from "@/lib/moderation/image";
import { moderateTextScores } from "@/lib/moderation/openai";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/moderation/text");

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** First blocklist phrase found in the text (case-insensitive, whole words), if any. */
export function blocklistMatch(text: string, phrases: string[]): string | null {
  for (const raw of phrases) {
    const phrase = raw.trim();
    if (!phrase) continue;
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}($|[^\\p{L}\\p{N}])`, "iu").test(text)) return phrase;
  }
  return null;
}

/**
 * Text moderation (§8.5 step 1): admin blocklist first (a hit scores 1.0 → auto-block), then OpenAI
 * omni-moderation. Empty text needs no check.
 */
export async function moderateText(text: string | null | undefined, opts: { blocklist?: string[] } = {}): Promise<ModerationResult> {
  const value = (text ?? "").trim();
  if (!value) return { scores: {}, available: true };
  const hit = blocklistMatch(value, opts.blocklist ?? []);
  if (hit) return { scores: { blocklist: 1 }, available: true, blocklistHit: hit };
  const scores = await moderateTextScores(value);
  return { scores, available: scores !== null };
}

export function maxScore(...results: ModerationResult[]): number {
  let max = 0;
  for (const r of results) for (const v of Object.values(r.scores ?? {})) max = Math.max(max, v);
  return max;
}

/**
 * The score fed into decidePost(). If any check could not run, the content is at least flagged for
 * human review (publish-then-review, or held if a hold applies) — never silently auto-passed.
 */
export function effectiveScore(results: ModerationResult[], autoFlagThreshold: number): number {
  const max = maxScore(...results);
  return results.some((r) => !r.available) ? Math.max(max, autoFlagThreshold) : max;
}
