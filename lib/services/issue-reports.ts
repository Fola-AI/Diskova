import type { SessionContext } from "@/lib/auth/guards";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { adminRecipients, sendEmail } from "@/lib/email/send";
import { SafetyIssueEmail } from "@/lib/email/templates/safety";
import { rateLimitAll, retryAfterText } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";
import { issueReportSchema } from "@/lib/validation/safety";

assertServerOnly("lib/services/issue-reports");

export class IssueReportError extends Error {}

/**
 * §10 private issue report → private.issue_reports (never public). Anonymous allowed with an email.
 * Honeypot submissions get the same response but are not stored.
 */
export async function submitIssueReport(session: SessionContext | null, raw: unknown, meta: { ip: string | null }): Promise<{ stored: boolean }> {
  const input = issueReportSchema.parse(raw);
  if (input.website) return { stored: false }; // bot

  if (!session && !input.email) throw new IssueReportError("Add your email so our team can follow up, or sign in.");
  const rl = await rateLimitAll([
    ["issueReportUser", session?.user.id ?? null],
    ["issueReportIp", meta.ip],
  ]);
  if (!rl.ok) throw new IssueReportError(`You've sent several reports. Please try again in ${retryAfterText(rl.reset)}.`);

  const { error } = await getAdminSupabase().rpc("admin_create_issue_report", {
    p_category: input.category as never,
    p_description: input.description,
    p_reporter_id: session?.user.id ?? undefined,
    p_reporter_email: session ? undefined : input.email ?? undefined,
    p_city_id: input.city_id ?? undefined,
    p_area_id: input.area_id ?? undefined,
    p_lat: input.lat ?? undefined,
    p_lng: input.lng ?? undefined,
  });
  if (error) throw new IssueReportError("We couldn't send your report. Please try again.");

  if (input.category === "safety") {
    await sendEmail({ to: adminRecipients(), subject: "New safety report", react: SafetyIssueEmail({ category: input.category }) });
  }
  return { stored: true };
}
