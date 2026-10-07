import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { parseBlocks } from "@/lib/content/markdown";
import type { GuideRow } from "@/lib/db/guides";

/** Article JSON-LD (+ TouristAttraction entries for venues embedded with <VendorCard/> / <Map/>). §8.7 */
export function guideJsonLd(g: Pick<GuideRow, "title" | "excerpt" | "body_md" | "cover_image_url" | "published_at" | "updated_at" | "type" | "tags">, url: string): Record<string, unknown> {
  const venues = parseBlocks(g.body_md).flatMap((b) => (b.type === "vendor-card" ? [b.slug] : b.type === "map" ? b.slugs : []));
  const unique = [...new Set(venues)];
  return {
    "@context": "https://schema.org",
    "@type": g.type === "blog" ? "BlogPosting" : "Article",
    headline: g.title.slice(0, 110),
    description: g.excerpt ?? undefined,
    image: g.cover_image_url ? [g.cover_image_url] : [`${SITE_URL}/opengraph-image`],
    datePublished: g.published_at ?? g.updated_at,
    dateModified: g.updated_at,
    author: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: BRAND_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: g.tags.length ? g.tags.join(", ") : undefined,
    about: unique.length
      ? unique.map((slug) => ({ "@type": "TouristAttraction", name: slug.replace(/-/g, " "), url: `${SITE_URL}/v/${slug}` }))
      : undefined,
  };
}

/** Safe to embed in <script type="application/ld+json">. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
