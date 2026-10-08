import { authedWrite, created, jsonBody } from "@/lib/api/v1";
import { clientIpFrom } from "@/lib/http/request-meta";
import { createCheckin, finalizeCheckin } from "@/lib/services/posts";

/**
 * POST /api/v1/posts { vendorId, crowdLevel, vibe, note?, waitMinutes?, coverFeeNgn?, lat?, lng?, consentNow? }
 * A text check-in. It goes through the same moderation as the app and may be held or hidden.
 * Photo check-ins use the web app's one-image-per-request upload pipeline.
 */
export const POST = authedWrite(async (req, session) => {
  const body = (await jsonBody(req)) as Record<string, unknown> | null;
  const { postId } = await createCheckin(session, { ...(body ?? {}), photoCount: 0 }, { ip: clientIpFrom(req.headers) });
  const result = await finalizeCheckin(session, postId);
  return created({ postId, status: result.status, holdReason: result.holdReason, points: result.points });
});
