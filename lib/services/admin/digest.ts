import { formatInTimeZone } from "date-fns-tz";

import { getAdminSupabase } from "@/lib/admin-db/client";
import { DEFAULT_TIMEZONE } from "@/lib/config";
import { adminRecipients, sendEmail, type SendResult } from "@/lib/email/send";
import { DailyDigestEmail, type DigestData } from "@/lib/email/templates/admin";
import { assertServerOnly } from "@/lib/server-only";
import type { PlatformSummary } from "@/lib/services/admin/dashboard";

assertServerOnly("lib/services/admin/digest");

export async function buildDigest(now = new Date()): Promise<DigestData> {
  const admin = getAdminSupabase();
  const [{ data: summary, error }, events, overdue] = await Promise.all([
    admin.rpc("admin_platform_summary"),
    admin.from("events").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    admin.from("admin_tasks").select("id", { count: "exact", head: true }).neq("status", "done").lt("due_at", now.toISOString()),
  ]);
  if (error || !summary) throw new Error(`digest summary failed: ${error?.message}`);
  const s = summary as unknown as PlatformSummary;
  return {
    date: formatInTimeZone(now, DEFAULT_TIMEZONE, "EEE d MMM yyyy"),
    signups: s.signups_24h,
    vendorSignups: s.vendor_signups_24h,
    pendingVendors: s.vendors_pending_review,
    posts: s.posts_24h,
    officialUpdates: s.official_updates_24h,
    checkins: s.checkins_24h,
    openModeration: s.moderation_open_p1 + s.moderation_open_p2 + s.moderation_open_p3_plus,
    openP1: s.moderation_open_p1,
    openReports: s.open_reports,
    openIssues: s.open_issue_reports,
    pendingEvents: events.count ?? 0,
    overdueTasks: overdue.count ?? 0,
  };
}

/** §11.15 daily digest to EMAIL_ADMIN_TO (fallback SUPER_ADMIN_EMAIL). */
export async function sendDailyDigest(): Promise<{ data: DigestData; result: SendResult }> {
  const data = await buildDigest();
  const result = await sendEmail({ to: adminRecipients(), subject: `Daily digest — ${data.date}`, react: DailyDigestEmail({ d: data }) });
  return { data, result };
}
