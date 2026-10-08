import { z } from "zod";

import { ApiProblem, clampLimit, ok, publicRead } from "@/lib/api/v1";
import { getCityBySlug } from "@/lib/db/directory";
import { listEvents } from "@/lib/db/events";
import { slugParam } from "@/lib/validation/routes";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({
  city: slugParam.optional(),
  season: z.literal("december").optional(),
  from: date.optional(),
  to: date.optional(),
  category: z.enum(["concert", "festival", "party", "beach_party", "boat_cruise", "comedy", "art", "food", "sport", "conference", "community", "other"]).optional(),
});

/** GET /api/v1/events[?city&season=december&from=YYYY-MM-DD&to&category&limit] — upcoming first. */
export const GET = publicRead(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const q = query.parse(Object.fromEntries([...sp].filter(([k]) => k !== "limit")));
  const city = q.city ? await getCityBySlug(q.city) : null;
  if (q.city && !city) throw new ApiProblem(404, "not_found", "Unknown city.");
  const events = await listEvents({
    cityId: city?.id,
    from: q.from ? new Date(`${q.from}T00:00:00+01:00`) : new Date(Date.now() - 6 * 3600_000),
    to: q.to ? new Date(`${q.to}T23:59:59+01:00`) : undefined,
    seasonOnly: q.season === "december",
    category: q.category,
    limit: clampLimit(sp.get("limit"), 50, 200),
  });
  return ok(events, { count: events.length }, 300);
});
