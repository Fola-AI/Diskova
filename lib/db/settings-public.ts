import { cache } from "react";

import { getPublicSupabase } from "@/lib/db/public";

/** Public platform settings (columns granted to anon): season, free-listing notice, FX, maintenance. */
export const getPublicSettings = cache(async () => {
  const { data, error } = await getPublicSupabase()
    .from("platform_settings")
    .select("listing_is_free, monetisation_notice_md, checkin_expiry_hours, december_season_start, december_season_end, fx_gbp_per_ngn, fx_usd_per_ngn, maintenance_mode")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data;
});
