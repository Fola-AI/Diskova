import { nanoid } from "nanoid";

import type { SessionContext } from "@/lib/auth/guards";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { getPlatformSettings, moderationSettings } from "@/lib/admin-db/settings";
import { ImageRejectedError, processImage } from "@/lib/media/image";
import { downloadIncoming, isOwnIncomingPath, putPublicWebp, removeIncoming, UploadError } from "@/lib/media/uploads";
import { decidePost, type DecideResult } from "@/lib/moderation/decide";
import { moderateImage } from "@/lib/moderation/image";
import { maxScore, moderateText } from "@/lib/moderation/text";
import { rateLimit, rateLimitAll, retryAfterText } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";
import { awardForPost } from "@/lib/services/points";
import { checkinSchema, pulseSchema } from "@/lib/validation/posts";

assertServerOnly("lib/services/posts");

export class PostError extends Error {}
export const MAX_CHECKIN_PHOTOS = 4;

/** Record explicit location consent given in the posting UI (stored on the profile, revocable in Settings). */
async function locationConsent(session: SessionContext, consentNow?: boolean): Promise<boolean> {
  if (session.profile.location_consent) return true;
  if (!consentNow) return false;
  await session.supabase.from("profiles").update({ location_consent: true }).eq("id", session.user.id);
  return true;
}

function point(lat?: number | null, lng?: number | null, consent?: boolean): string | null {
  // Location is only stored with the user's explicit consent (§7.12); it is never shown publicly.
  if (!consent || lat === null || lat === undefined || lng === null || lng === undefined) return null;
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/** §8.3 one-tap pulse: crowd level only → publishes immediately (trigger), never held. */
export async function createPulse(
  session: SessionContext,
  raw: unknown,
  meta: { ip: string | null },
): Promise<{ postId: string; isAtVenue: boolean; points: number }> {
  const input = pulseSchema.parse(raw);
  const rl = await rateLimitAll([
    ["pulseUser", session.user.id],
    ["pulseUserVendor", `${session.user.id}:${input.vendorId}`],
    ["postIp", meta.ip],
  ]);
  if (!rl.ok) throw new PostError(`You've pulsed this recently. Try again in ${retryAfterText(rl.reset)}.`);

  const { data, error } = await session.supabase
    .from("posts")
    .insert({
      author_id: session.user.id,
      vendor_id: input.vendorId,
      kind: "pulse",
      crowd_level: input.crowdLevel,
      location: point(input.lat, input.lng, await locationConsent(session, input.consentNow)),
    })
    .select("id, author_id, vendor_id, kind, is_at_venue, created_at, status")
    .single();
  if (error || !data) throw new PostError("You can't pulse this venue right now.");
  const points = data.status === "published" ? await awardForPost(data, { hasPhoto: false }) : 0;
  return { postId: data.id, isAtVenue: data.is_at_venue, points };
}

/** Step 1 of a check-in: create the pending post. Photos are attached one per request, then finalised. */
export async function createCheckin(
  session: SessionContext,
  raw: unknown,
  meta: { ip: string | null },
): Promise<{ postId: string }> {
  const input = checkinSchema.parse(raw);
  const settings = await getPlatformSettings();
  const rl = await rateLimitAll([
    ["postUser", session.user.id, { tokens: settings.max_posts_per_user_per_hour }],
    ["postIp", meta.ip],
  ]);
  if (!rl.ok) throw new PostError(`You've posted a lot recently. Try again in ${retryAfterText(rl.reset)}.`);

  const { data, error } = await session.supabase
    .from("posts")
    .insert({
      author_id: session.user.id,
      vendor_id: input.vendorId,
      kind: "checkin",
      crowd_level: input.crowdLevel,
      vibe: input.vibe,
      wait_minutes: input.waitMinutes,
      cover_fee_ngn: input.coverFeeNgn,
      body: input.note,
      location: point(input.lat, input.lng, await locationConsent(session, input.consentNow)),
    })
    .select("id")
    .single();
  if (error || !data) throw new PostError("You can't check in here right now.");
  return { postId: data.id };
}

async function ownPendingPost(session: SessionContext, postId: string) {
  const { data } = await getAdminSupabase()
    .from("posts")
    .select("id, author_id, vendor_id, kind, status, moderation_decision, is_at_venue, created_at, body")
    .eq("id", postId)
    .maybeSingle();
  if (!data || data.author_id !== session.user.id) throw new PostError("Post not found.");
  if (data.status !== "pending" || data.moderation_decision !== null) throw new PostError("This post is already submitted.");
  return data;
}

/** Process ONE check-in photo (§7.6) and attach it to the caller's pending post. */
export async function attachCheckinPhoto(session: SessionContext, postId: string, incomingPath: string): Promise<{ mediaId: string }> {
  try {
    if (!isOwnIncomingPath(session.user.id, incomingPath)) throw new PostError("Invalid upload.");
    await ownPendingPost(session, postId);
    const admin = getAdminSupabase();
    const { count } = await admin.from("post_media").select("id", { count: "exact", head: true }).eq("post_id", postId);
    if ((count ?? 0) >= MAX_CHECKIN_PHOTOS) throw new PostError(`Up to ${MAX_CHECKIN_PHOTOS} photos per check-in.`);

    const image = await processImage(await downloadIncoming(incomingPath));
    const moderation = await moderateImage(image.data);
    const path = `posts/${postId}/${nanoid(12)}.webp`;
    await putPublicWebp(path, image.data);
    const { data, error } = await admin
      .from("post_media")
      .insert({
        post_id: postId,
        storage_path: path,
        kind: "image",
        width: image.width,
        height: image.height,
        blurhash: image.blurhash,
        phash: image.phash,
        moderation_score: moderation.scores,
        sort_order: count ?? 0,
        processed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) throw new PostError("Couldn't save the photo.");
    return { mediaId: data.id };
  } catch (err) {
    if (err instanceof ImageRejectedError || err instanceof UploadError) throw new PostError(err.message);
    throw err;
  } finally {
    await removeIncoming(incomingPath).catch(() => undefined);
  }
}

export interface FinalizeResult extends DecideResult {
  points: number;
  photos: number;
}

/** Last step: run the §8.5 decision over text + processed photos, publish / hold / hide, award points. */
export async function finalizeCheckin(session: SessionContext, postId: string): Promise<FinalizeResult> {
  const post = await ownPendingPost(session, postId);
  const admin = getAdminSupabase();
  const [{ data: media }, settings, { data: author }] = await Promise.all([
    admin.from("post_media").select("moderation_score, processed_at").eq("post_id", postId),
    getPlatformSettings(),
    admin.from("profiles").select("trust_score, created_at").eq("id", session.user.id).single(),
  ]);
  const photos = (media ?? []).filter((m) => m.processed_at).length;
  const textMod = await moderateText(post.body);
  const imageScores = (media ?? []).map((m) => ({ decision: "auto_pass" as const, scores: (m.moderation_score ?? null) as Record<string, number> | null }));

  const result = decidePost({
    kind: "checkin",
    hasImage: photos > 0,
    hasVideo: false,
    accountAgeDays: author ? (Date.now() - new Date(author.created_at).getTime()) / 86_400_000 : 0,
    trustScore: author?.trust_score ?? 0,
    maxScore: maxScore(textMod, ...imageScores),
    settings: moderationSettings(settings),
  });

  const { error } = await admin
    .from("posts")
    .update({
      status: result.status,
      hold_reason: result.holdReason,
      moderation_decision: result.decision,
      moderation_score: { text: textMod.scores },
    })
    .eq("id", postId);
  if (error) throw new PostError("Couldn't publish your check-in.");

  const points = result.status === "published" ? await awardForPost(post, { hasPhoto: photos > 0 }) : 0;
  return { ...result, points, photos };
}

/** Like / unlike. Who-liked is kept in Redis (no likes table in §6); the count lives on the post. */
export async function toggleLike(session: SessionContext, postId: string): Promise<{ liked: boolean; count: number }> {
  const { getRedis } = await import("@/lib/ratelimit");
  const redis = getRedis();
  if (!redis) throw new PostError("Likes are unavailable right now.");
  const rl = await rateLimit("likeUser", session.user.id);
  if (!rl.ok) throw new PostError("Slow down a little.");
  const { data: visible } = await session.supabase.from("posts").select("id").eq("id", postId).eq("status", "published").maybeSingle();
  if (!visible) throw new PostError("Post not found.");

  const key = `likes:${postId}`;
  const added = await redis.sadd(key, session.user.id);
  const liked = added === 1 ? true : (await redis.srem(key, session.user.id), false);
  const count = await redis.scard(key);
  await getAdminSupabase().from("posts").update({ like_count: count }).eq("id", postId);
  return { liked, count };
}

export async function likedPostIds(session: SessionContext, postIds: string[]): Promise<string[]> {
  const { getRedis } = await import("@/lib/ratelimit");
  const redis = getRedis();
  if (!redis || !postIds.length) return [];
  const pipeline = redis.pipeline();
  for (const id of postIds) pipeline.sismember(`likes:${id}`, session.user.id);
  const res = (await pipeline.exec()) as number[];
  return postIds.filter((_, i) => res[i] === 1);
}
