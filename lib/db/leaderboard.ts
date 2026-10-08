import { getPublicSupabase } from "@/lib/db/public";

export interface LeaderRow {
  rank: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  badges: string[];
  points: number;
}

/** Monthly / December in Nigeria leaderboards (materialized views, refreshed hourly by pg_cron). */
export async function getLeaderboard(board: "month" | "december", scopeKey: string, limit = 50): Promise<LeaderRow[]> {
  const view = board === "month" ? "v_leaderboard_month" : "v_leaderboard_december";
  const { data, error } = await getPublicSupabase()
    .from(view)
    .select("rank, username, display_name, avatar_url, badges, points")
    .eq("scope_key", scopeKey)
    .order("rank")
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LeaderRow[];
}
