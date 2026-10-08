"use server";

import { getSession } from "@/lib/auth/guards";

/** The signed-in user's home city slug (used to open the Tonight view on their city). */
export async function getMyHomeCityAction(): Promise<string | null> {
  const session = await getSession();
  if (!session?.profile.home_city_id) return null;
  const { data } = await session.supabase.from("cities").select("slug").eq("id", session.profile.home_city_id).maybeSingle();
  return data?.slug ?? null;
}
