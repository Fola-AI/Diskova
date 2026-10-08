import { publicStorageUrl } from "@/lib/config";
import { getPublicSupabase } from "@/lib/db/public";
import { blurDataUrl } from "@/lib/media/blur";

/** Public feed shapes (what anon sees under RLS: published, non-shadowbanned). */
export interface FeedMedia {
  url: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  /** Tiny data URL decoded from the blurhash, for next/image `placeholder="blur"`. */
  placeholder?: string;
}

export interface FeedPost {
  id: string;
  kind: "checkin" | "pulse" | "update" | "official";
  crowd_level: number | null;
  vibe: number | null;
  wait_minutes: number | null;
  cover_fee_ngn: number | null;
  body: string | null;
  is_at_venue: boolean;
  verified: boolean;
  like_count: number;
  created_at: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
  media: FeedMedia[];
}

const POST_SELECT =
  "id, kind, crowd_level, vibe, wait_minutes, cover_fee_ngn, body, is_at_venue, verified, like_count, created_at, author:profiles!posts_author_id_fkey(username, display_name, avatar_url), media:post_media(storage_path, width, height, blurhash, sort_order)";

type RawPost = Omit<FeedPost, "media"> & {
  media: Array<{ storage_path: string; width: number | null; height: number | null; blurhash: string | null; sort_order: number }>;
};

function shape(rows: RawPost[]): FeedPost[] {
  return rows.map((r) => ({
    ...r,
    media: [...r.media]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ url: publicStorageUrl("media", m.storage_path), width: m.width, height: m.height, blurhash: m.blurhash, placeholder: blurDataUrl(m.blurhash) })),
  }));
}

/** Live (non-expired) community posts for a venue, newest first. Official updates are pinned separately. */
export async function listVendorFeed(vendorId: string, limit = 30): Promise<FeedPost[]> {
  const { data, error } = await getPublicSupabase()
    .from("posts")
    .select(POST_SELECT)
    .eq("vendor_id", vendorId)
    .eq("status", "published")
    .is("deleted_at", null)
    .in("kind", ["checkin", "pulse", "update"])
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return shape((data ?? []) as unknown as RawPost[]);
}

/** Recent published community photos for the cover gallery (§8.2: last 12). */
export async function listCommunityPhotos(vendorId: string, limit = 12): Promise<FeedMedia[]> {
  const { data, error } = await getPublicSupabase()
    .from("posts")
    .select("media:post_media(storage_path, width, height, blurhash, sort_order)")
    .eq("vendor_id", vendorId)
    .eq("status", "published")
    .is("deleted_at", null)
    .in("kind", ["checkin"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const media = (data ?? []).flatMap((p) => (p.media ?? []) as RawPost["media"]);
  return media.slice(0, limit).map((m) => ({ url: publicStorageUrl("media", m.storage_path), width: m.width, height: m.height, blurhash: m.blurhash, placeholder: blurDataUrl(m.blurhash) }));
}

/** Public posts by a user (published only; shown on /u/[username], including expired ones). */
export async function listUserPublicPosts(profileId: string, limit = 30) {
  const { data, error } = await getPublicSupabase()
    .from("posts")
    .select(`${POST_SELECT}, vendor:vendors(slug, name)`)
    .eq("author_id", profileId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<RawPost & { vendor: { slug: string; name: string } | null }>;
  return shape(rows).map((p, i) => ({ ...p, vendor: rows[i].vendor }));
}
