import { getPublicSupabase } from "@/lib/db/public";
import type { Database } from "@/lib/db/types";

export type GuideType = Database["public"]["Enums"]["guide_type"];

export interface GuideRow {
  id: string;
  slug: string;
  type: GuideType;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_image_url: string | null;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
  city: { slug: string; name: string } | null;
}

const SELECT = "id, slug, type, title, excerpt, body_md, cover_image_url, tags, seo_title, seo_description, published_at, updated_at, city:cities(slug, name)";

/** Public URL for a guide by type (§8.7 routes). */
export function guideHref(g: { type: GuideType; slug: string; city: { slug: string } | null }): string {
  switch (g.type) {
    case "toolkit":
      return `/toolkit/${g.slug}`;
    case "blog":
      return `/blog/${g.slug}`;
    case "safety_page":
      return g.city ? `/safety/${g.city.slug}` : "/safety";
    default:
      return `/guides/${g.city?.slug ?? "nigeria"}/${g.slug}`;
  }
}

export async function getPublishedGuide(slug: string, types: GuideType[]): Promise<GuideRow | null> {
  const { data, error } = await getPublicSupabase()
    .from("guides")
    .select(SELECT)
    .eq("slug", slug)
    .in("type", types)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as GuideRow | null;
}

export async function listPublishedGuides(opts: { types: GuideType[]; cityId?: string; tag?: string; limit?: number }): Promise<GuideRow[]> {
  let q = getPublicSupabase()
    .from("guides")
    .select(SELECT)
    .in("type", opts.types)
    .eq("status", "published")
    .is("deleted_at", null);
  if (opts.cityId) q = q.eq("city_id", opts.cityId);
  if (opts.tag) q = q.contains("tags", [opts.tag]);
  const { data, error } = await q.order("published_at", { ascending: false }).limit(opts.limit ?? 50);
  if (error) throw error;
  return (data ?? []) as unknown as GuideRow[];
}

export async function listGuideSitemapEntries(): Promise<Array<{ href: string; updated_at: string }>> {
  const { data } = await getPublicSupabase()
    .from("guides")
    .select("slug, type, updated_at, city:cities(slug)")
    .eq("status", "published")
    .is("deleted_at", null)
    .neq("type", "safety_page")
    .limit(5000);
  return ((data ?? []) as unknown as Array<{ slug: string; type: GuideType; updated_at: string; city: { slug: string } | null }>).map((g) => ({
    href: guideHref(g),
    updated_at: g.updated_at,
  }));
}
