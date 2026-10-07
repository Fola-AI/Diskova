import { authedWrite, created, jsonBody } from "@/lib/api/v1";
import { reportContent } from "@/lib/services/reports";

/** POST /api/v1/reports { entityType: post|vendor|event|profile, entityId, reason, details? } */
export const POST = authedWrite(async (req, session) => {
  await reportContent(session, await jsonBody(req));
  return created({ received: true });
});
