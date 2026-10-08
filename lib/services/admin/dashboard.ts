import { getAdminSupabase } from "@/lib/admin-db/client";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/admin/dashboard");

export interface PlatformSummary {
  users_total: number; signups_24h: number; vendors_total: number; vendor_signups_24h: number; vendors_pending_review: number;
  vendors_verified: number; posts_24h: number; official_updates_24h: number; checkins_24h: number; pulses_24h: number;
  live_vendors: number; moderation_open_p1: number; moderation_open_p2: number; moderation_open_p3_plus: number;
  open_reports: number; open_issue_reports: number; generated_at: string;
}

/** §11.1 dashboard data. */
export async function getDashboard() {
  const admin = getAdminSupabase();
  const [summary, series, stats, pendingVendors, pendingEvents, tasks, unverifiedSafety] = await Promise.all([
    admin.rpc("admin_platform_summary"),
    admin.rpc("admin_daily_counts", { p_days: 14 }),
    admin.rpc("admin_moderation_stats"),
    admin.from("vendors").select("id, name, updated_at").eq("status", "pending_review").is("deleted_at", null).order("updated_at").limit(5),
    admin.from("events").select("id, title, starts_at").eq("status", "pending_review").order("starts_at").limit(5),
    admin.from("admin_tasks").select("id, title, priority, due_at, status").neq("status", "done").order("due_at", { ascending: true, nullsFirst: false }).limit(8),
    admin.from("safety_info").select("id", { count: "exact", head: true }).is("last_verified_at", null),
  ]);
  return {
    summary: summary.data as unknown as PlatformSummary,
    series: series.data ?? [],
    moderation: stats.data as unknown as { open_total: number; median_seconds_to_close_7d: number | null; auto_flagged_7d: number; human_actioned_7d: number },
    pendingVendors: pendingVendors.data ?? [],
    pendingEvents: pendingEvents.data ?? [],
    tasks: tasks.data ?? [],
    unverifiedSafety: unverifiedSafety.count ?? 0,
  };
}
