import { redirect } from "next/navigation";

import { DEFAULT_CITY_SLUG } from "@/lib/config";

export default function LeaderboardIndex() {
  redirect(`/leaderboard/${DEFAULT_CITY_SLUG}`);
}
