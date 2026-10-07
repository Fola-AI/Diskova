import { ApiProblem, ok, publicRead } from "@/lib/api/v1";
import { FEATURES } from "@/lib/config";
import { getCityBySlug } from "@/lib/db/directory";
import { getLeaderboard } from "@/lib/db/leaderboard";
import { slugParam } from "@/lib/validation/routes";

/** GET /api/v1/leaderboard/:city[?board=month|december] — public usernames and points only. */
export const GET = publicRead(async (req: Request, { params }: { params: Promise<{ city: string }> }) => {
  if (!FEATURES.points) throw new ApiProblem(404, "not_found", "Leaderboards are off.");
  const city = await getCityBySlug(slugParam.parse((await params).city));
  if (!city) throw new ApiProblem(404, "not_found", "Unknown city.");
  const board = new URL(req.url).searchParams.get("board") === "december" ? "december" : "month";
  const rows = await getLeaderboard(board, city.id, 50);
  return ok(rows, { city: city.slug, board, count: rows.length }, 300);
});
