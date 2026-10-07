import { nanoid } from "nanoid";

import type { SessionContext } from "@/lib/auth/guards";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { getPlatformSettings, moderationSettings } from "@/lib/admin-db/settings";
import { ImageRejectedError, processImage } from "@/lib/media/image";
import { downloadIncoming, isOwnIncomingPath, putPublicWebp, removeIncoming } from "@/lib/media/uploads";
import { decidePost, type DecideResult } from "@/lib/moderation/decide";
import { moderateImage } from "@/lib/moderation/image";
import { maxScore, moderateText } from "@/lib/moderation/text";
import { rateLimitAll, retryAfterText } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";
import { awardForPost } from "@/lib/services/points";
import { officialUpdateSchema } from "@/lib/validation/vendor";

assertServerOnly("lib/services/official-updates");

export class OfficialUpdateError extends Error {}

export interface OfficialUpdateResult extends DecideResult {
  postId: string;
  vendorSlug: string;
}

/**
 * "Post an official update" (§1.6, §8.9): crowd level (+ optional note, + optional ONE photo).
 * The post is inserted through the member's own RLS client (can_post_official), the photo goes through
 * the one-image pipeline, then the §8.5 decision publishes, holds or hides it (service role).
 */
export async function createOfficialUpdate(
  session: SessionContext,
  raw: unknown,
  meta: { ip: string | null },
): Promise<OfficialUpdateResult> {
  const input = officialUpdateSchema.parse(raw);
  const settings = await getPlatformSettings();

  const rl = await rateLimitAll([
    ["postUser", session.user.id, { tokens: settings.max_posts_per_user_per_hour }],
    ["postIp", meta.ip],
  ]);
  if (!rl.ok) throw new OfficialUpdateError(`You've posted a lot recently. Try again in ${retryAfterText(rl.reset)}.`);

  if (input.incomingPath && !isOwnIncomingPath(session.user.id, input.incomingPath)) {
    throw new OfficialUpdateError("Invalid photo upload.");
  }

  const { data: post, error } = await session.supabase
    .from("posts")
    .insert({
      author_id: session.user.id,
      vendor_id: input.vendorId,
      kind: "official",
      crowd_level: input.crowdLevel,
      body: input.note,
    })
    .select("id, vendor:vendors(slug)")
    .single();
  if (error || !post) {
    throw new OfficialUpdateError("You can't post official updates for this venue.");
  }
  const vendorSlug = (post.vendor as unknown as { slug: string } | null)?.slug ?? "";
  const admin = getAdminSupabase();

  let imageScores = { decision: "auto_pass" as const, scores: null as Record<string, number> | null };
  let hasImage = false;
  try {
    if (input.incomingPath) {
      const original = await downloadIncoming(input.incomingPath);
      const image = await processImage(original);
      const imgMod = await moderateImage(image.data);
      imageScores = { decision: "auto_pass", scores: imgMod.scores };
      const path = `posts/${post.id}/${nanoid(12)}.webp`;
      await putPublicWebp(path, image.data);
      const { error: mediaError } = await admin.from("post_media").insert({
        post_id: post.id,
        storage_path: path,
        kind: "image",
        width: image.width,
        height: image.height,
        blurhash: image.blurhash,
        phash: image.phash,
        moderation_score: imgMod.scores,
        processed_at: new Date().toISOString(),
      });
      if (mediaError) throw mediaError;
      hasImage = true;
    }
  } catch (err) {
    // Leave nothing half-published: remove the post if its photo failed.
    await admin.from("posts").update({ deleted_at: new Date().toISOString(), status: "removed" }).eq("id", post.id);
    if (err instanceof ImageRejectedError) throw new OfficialUpdateError(err.message);
    throw new OfficialUpdateError("We couldn't process that photo. Please try another or post without one.");
  } finally {
    if (input.incomingPath) await removeIncoming(input.incomingPath).catch(() => undefined);
  }

  const textMod = await moderateText(input.note);
  const { data: author } = await admin.from("profiles").select("trust_score, created_at").eq("id", session.user.id).single();
  const accountAgeDays = author ? (Date.now() - new Date(author.created_at).getTime()) / 86_400_000 : 0;

  const result = decidePost({
    kind: "official",
    hasImage,
    hasVideo: false,
    accountAgeDays,
    trustScore: author?.trust_score ?? 0,
    maxScore: maxScore(textMod, imageScores),
    settings: moderationSettings(settings),
  });

  const { error: updateError } = await admin
    .from("posts")
    .update({
      status: result.status,
      hold_reason: result.holdReason,
      moderation_decision: result.decision,
      moderation_score: { text: textMod.scores, image: imageScores.scores },
    })
    .eq("id", post.id);
  if (updateError) throw new OfficialUpdateError("We couldn't publish your update. Please try again.");

  if (result.status === "published") {
    await awardForPost(
      { id: post.id, author_id: session.user.id, vendor_id: input.vendorId, kind: "official", is_at_venue: false, created_at: new Date().toISOString() },
      { hasPhoto: hasImage },
    );
  }
  return { ...result, postId: post.id, vendorSlug };
}
