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

// ---------------------------------------------------------------------------------------------
// L14 JSON-LD audit: venue, breadcrumbs, website + organisation. No ratings/reviews (PRD §16).

/** schema.org type per category slug (closest specific LocalBusiness / Place subtype). */
export const CATEGORY_SCHEMA_TYPE: Record<string, string> = {
  nightclub: "NightClub",
  lounge: "BarOrPub",
  bar: "BarOrPub",
  rooftop: "BarOrPub",
  hotel_bar: "BarOrPub",
  restaurant: "Restaurant",
  street_food: "FastFoodRestaurant",
  cafe: "CafeOrCoffeeShop",
  beach: "Beach",
  resort: "Resort",
  cinema: "MovieTheater",
  art_gallery: "ArtGallery",
  museum: "Museum",
  historic_site: "LandmarksOrHistoricalBuildings",
  nature: "Park",
  amusement_park: "AmusementPark",
  concert_venue: "MusicVenue",
  event_space: "EventVenue",
  market: "LocalBusiness",
};

const DAY_NAMES: Record<string, string> = { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" };

export interface VendorJsonLdInput {
  slug: string;
  name: string;
  tagline: string | null;
  description_md: string | null;
  category: { slug: string; name: string } | null;
  area: { name: string } | null;
  city: { name: string } | null;
  address_line: string | null;
  lat: number | null;
  lng: number | null;
  cover_image_url: string | null;
  price_symbol: string | null;
  phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  opening_hours: Partial<Record<string, Array<[string, string]>>>;
  features: string[];
}

export function vendorJsonLd(v: VendorJsonLdInput): Record<string, unknown> {
  const url = `${SITE_URL}/v/${v.slug}`;
  const hours = Object.entries(v.opening_hours).flatMap(([day, intervals]) =>
    (intervals ?? []).map(([opens, closes]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[day], opens, closes })),
  );
  return {
    "@context": "https://schema.org",
    "@type": CATEGORY_SCHEMA_TYPE[v.category?.slug ?? ""] ?? "LocalBusiness",
    "@id": url,
    name: v.name,
    url,
    description: v.tagline ?? v.description_md?.slice(0, 300) ?? undefined,
    image: v.cover_image_url ? [v.cover_image_url] : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: v.address_line ?? undefined,
      addressLocality: v.area?.name ?? v.city?.name ?? undefined,
      addressRegion: v.city?.name ?? undefined,
      addressCountry: "NG",
    },
    geo: v.lat !== null && v.lng !== null ? { "@type": "GeoCoordinates", latitude: v.lat, longitude: v.lng } : undefined,
    priceRange: v.price_symbol ?? undefined,
    telephone: v.phone ?? undefined,
    sameAs: [v.website_url, v.instagram_url].filter(Boolean).length ? [v.website_url, v.instagram_url].filter(Boolean) : undefined,
    openingHoursSpecification: hours.length ? hours : undefined,
    amenityFeature: v.features.length ? v.features.map((f) => ({ "@type": "LocationFeatureSpecification", name: f.replace(/_/g, " "), value: true })) : undefined,
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}

/** Home page: the site + organisation, with a sitelinks search box pointing at /search. */
export function siteJsonLd(): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: BRAND_NAME,
      url: SITE_URL,
      inLanguage: "en-NG",
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" },
    },
    { "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: BRAND_NAME, url: SITE_URL, logo: `${SITE_URL}/icons/icon-512.png` },
  ];
}
