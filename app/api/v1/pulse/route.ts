import { authedWrite, created, jsonBody } from "@/lib/api/v1";
import { clientIpFrom } from "@/lib/http/request-meta";
import { createPulse } from "@/lib/services/posts";

/** POST /api/v1/pulse { vendorId, crowdLevel 1–5, lat?, lng?, consentNow? } — one-tap crowd level. */
export const POST = authedWrite(async (req, session) => {
  const result = await createPulse(session, await jsonBody(req), { ip: clientIpFrom(req.headers) });
  return created(result);
});
