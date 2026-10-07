import { getAdminSupabase } from "@/lib/admin-db/client";
import { hammingDistance } from "@/lib/media/image";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/moderation/heuristics");

/**
 * §8.5 step 5 / §7.10. Signals for moderators. ONLY `phashDuplicate` and `burst` escalate priority;
 * distance, IP and device data are informational and never trigger anything automatically.
 */
export interface Heuristics {
  phashDuplicate: { postId: string; vendorId: string; distance: number } | null;
  postsLast10Min: number;
  burst: boolean;
  distanceFromVenueM: number | null;
  isAtVenue: boolean;
  riskScore: number; // 0–100, display only
}

export const NEAR_DUPLICATE_MAX_DISTANCE = 6; // of 64 bits
export const BURST_THRESHOLD = 3; // > 3 posts in 10 minutes

export async function computeHeuristics(postId: string): Promise<Heuristics> {
  const admin = getAdminSupabase();
  const { data: post } = await admin
    .from("posts")
    .select("id, author_id, vendor_id, created_at, distance_from_venue_m, is_at_venue, media:post_media(phash)")
    .eq("id", postId)
    .single();
  if (!post) throw new Error("post not found");

  const since10 = new Date(new Date(post.created_at).getTime() - 10 * 60_000).toISOString();
  const { count: recent } = await admin
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", post.author_id)
    .gte("created_at", since10)
    .lte("created_at", post.created_at);

  let phashDuplicate: Heuristics["phashDuplicate"] = null;
  const hashes = (post.media ?? []).map((m) => m.phash).filter((h): h is string => Boolean(h));
  if (hashes.length) {
    const { data: others } = await admin
      .from("post_media")
      .select("phash, post:posts!inner(id, vendor_id, created_at)")
      .not("phash", "is", null)
      .neq("post.vendor_id", post.vendor_id)
      .gte("post.created_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .limit(5000);
    for (const o of (others ?? []) as unknown as Array<{ phash: string; post: { id: string; vendor_id: string } }>) {
      for (const h of hashes) {
        const d = hammingDistance(h, o.phash);
        if (d <= NEAR_DUPLICATE_MAX_DISTANCE && (!phashDuplicate || d < phashDuplicate.distance)) {
          phashDuplicate = { postId: o.post.id, vendorId: o.post.vendor_id, distance: d };
        }
      }
    }
  }

  const postsLast10Min = recent ?? 0;
  const burst = postsLast10Min > BURST_THRESHOLD;
  const riskScore = Math.min(
    100,
    (phashDuplicate ? 60 : 0) + (burst ? 30 : 0) + (post.distance_from_venue_m && post.distance_from_venue_m > 5000 ? 10 : 0),
  );
  return {
    phashDuplicate,
    postsLast10Min,
    burst,
    distanceFromVenueM: post.distance_from_venue_m,
    isAtVenue: post.is_at_venue,
    riskScore,
  };
}

/** Escalate to P1 when an escalating heuristic fires (creating a queue item if needed). */
export async function escalateIfNeeded(postId: string): Promise<Heuristics> {
  const h = await computeHeuristics(postId);
  if (!h.phashDuplicate && !h.burst) return h;
  const admin = getAdminSupabase();
  const { data: open } = await admin
    .from("moderation_items")
    .select("id")
    .eq("entity_type", "post")
    .eq("entity_id", postId)
    .neq("status", "done");
  if (open?.length) {
    await admin.from("moderation_items").update({ priority: 1 }).in("id", open.map((o) => o.id));
  } else {
    await admin.from("moderation_items").insert({ entity_type: "post", entity_id: postId, priority: 1, source: "auto_flag", outcome: null });
  }
  return h;
}
