import { cache } from "react";

import { getAdminSupabase } from "@/lib/admin-db/client";
import type { Database } from "@/lib/db/types";
import type { ModerationSettings } from "@/lib/moderation/decide";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/admin-db/settings");

export type PlatformSettings = Database["public"]["Tables"]["platform_settings"]["Row"];

/** Full platform_settings row (thresholds and blocklist are not readable by API roles). */
export const getPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  const { data, error } = await getAdminSupabase().from("platform_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
});

export function moderationSettings(s: PlatformSettings): ModerationSettings {
  return {
    autoBlockThreshold: Number(s.moderation_auto_block_threshold),
    autoFlagThreshold: Number(s.moderation_auto_flag_threshold),
    holdTrustBelow: s.media_hold_trust_below,
    holdAccountAgeDays: s.media_hold_account_age_days,
  };
}
