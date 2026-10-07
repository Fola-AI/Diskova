import type { SessionContext } from "@/lib/auth/guards";
import { rateLimit, retryAfterText } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";
import { reportSchema } from "@/lib/validation/posts";

assertServerOnly("lib/services/reports");

export class ReportError extends Error {}

/** Report a post / vendor / event / profile (§6.15). Thresholds + auto-hide are trigger-driven. */
export async function reportContent(session: SessionContext, raw: unknown): Promise<void> {
  const input = reportSchema.parse(raw);
  const rl = await rateLimit("reportUser", session.user.id);
  if (!rl.ok) throw new ReportError(`You've sent several reports. Try again in ${retryAfterText(rl.reset)}.`);
  const { error } = await session.supabase.from("reports").insert({
    reporter_id: session.user.id,
    entity_type: input.entityType,
    entity_id: input.entityId,
    reason: input.reason,
    details: input.details,
  });
  if (error) {
    if (error.code === "23505") throw new ReportError("You've already reported this. Our team will review it.");
    throw new ReportError("We couldn't send your report. Please try again.");
  }
}
