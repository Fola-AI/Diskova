import { encode } from "blurhash";
import { describe, expect, it } from "vitest";

import { breadcrumbJsonLd, CATEGORY_SCHEMA_TYPE, jsonLdScript, siteJsonLd, vendorJsonLd } from "@/lib/content/jsonld";
import { blurDataUrl } from "@/lib/media/blur";

describe("blurhash placeholders", () => {
  it("decodes a blurhash to a tiny BMP data URL, and rejects junk", () => {
    const pixels = new Uint8ClampedArray(4 * 4 * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 37) % 255));
    const hash = encode(pixels, 4, 4, 4, 3);
    const url = blurDataUrl(hash)!;
    expect(url.startsWith("data:image/bmp;base64,")).toBe(true);
    const bytes = Buffer.from(url.split(",")[1]!, "base64");
    expect(bytes.subarray(0, 2).toString("ascii")).toBe("BM");
    expect(bytes.length).toBe(54 + 8 * 24); // 8×8, 24-bit rows (already 4-byte aligned)
    expect(blurDataUrl("not-a-hash")).toBeUndefined();
    expect(blurDataUrl(null)).toBeUndefined();
  });
});

describe("JSON-LD (L14 audit)", () => {
  const vendor = vendorJsonLd({
    slug: "afrobeat-junction-lagos", name: "Afrobeat Junction", tagline: "Live band Thursdays", description_md: null,
    category: { slug: "nightclub", name: "Nightclub" }, area: { name: "Victoria Island" }, city: { name: "Lagos" },
    address_line: "1 Example St", lat: 6.43, lng: 3.42, cover_image_url: null, price_symbol: "₦₦₦", phone: null,
    website_url: "https://example.com", instagram_url: null, opening_hours: { fri: [["22:00", "05:00"]] }, features: ["live_music"],
  });

  it("venues use a specific schema.org type, address, geo, hours and price range — never ratings", () => {
    expect(vendor["@type"]).toBe("NightClub");
    expect(vendor.address).toMatchObject({ "@type": "PostalAddress", addressCountry: "NG", addressLocality: "Victoria Island" });
    expect(vendor.geo).toMatchObject({ latitude: 6.43, longitude: 3.42 });
    expect(vendor.openingHoursSpecification).toEqual([{ "@type": "OpeningHoursSpecification", dayOfWeek: "Friday", opens: "22:00", closes: "05:00" }]);
    expect(vendor.priceRange).toBe("₦₦₦");
    expect(JSON.stringify(vendor)).not.toMatch(/aggregateRating|review/i);
  });

  it("every category maps to a schema.org type", () => {
    for (const slug of ["amusement_park", "art_gallery", "bar", "beach", "cafe", "cinema", "concert_venue", "event_space", "historic_site", "hotel_bar", "lounge", "market", "museum", "nature", "nightclub", "resort", "restaurant", "rooftop", "street_food"]) {
      expect(CATEGORY_SCHEMA_TYPE[slug], slug).toBeTruthy();
    }
  });

  it("breadcrumbs are positioned absolute URLs; the home page declares a search action", () => {
    const b = breadcrumbJsonLd([{ name: "Lagos", path: "/c/lagos" }, { name: "X", path: "/v/x" }]) as { itemListElement: Array<{ position: number; item: string }> };
    expect(b.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(b.itemListElement[0]!.item).toMatch(/^https?:\/\/.+\/c\/lagos$/);
    expect(JSON.stringify(siteJsonLd())).toContain("search?q={search_term_string}");
  });

  it("JSON-LD can't break out of its script tag", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
