import { ok, publicRead } from "@/lib/api/v1";
import { listCities } from "@/lib/db/directory";

/** GET /api/v1/cities — launch cities. */
export const GET = publicRead(async () => {
  const cities = await listCities();
  return ok(cities.map(({ id, slug, name, state, timezone, lat, lng }) => ({ id, slug, name, state, timezone, lat, lng })), { count: cities.length }, 3600);
});
