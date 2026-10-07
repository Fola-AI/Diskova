import { describe, expect, it } from "vitest";

import { formatNaira, priceBandSymbol } from "@/lib/directory/constants";
import {
  boltUrl,
  directionsUrl,
  instagramUrl,
  normaliseNgPhone,
  safeExternalUrl,
  uberUrl,
  whatsappChatUrl,
  whatsappShareUrl,
} from "@/lib/directory/links";

const vi = { lat: 6.4281, lng: 3.4216 };

describe("deep links (§8.2)", () => {
  it("builds the PRD's Uber and Bolt formats", () => {
    const uber = new URL(uberUrl(vi, "Indigo Tide"));
    expect(uber.origin + uber.pathname).toBe("https://m.uber.com/ul/");
    expect(uber.searchParams.get("action")).toBe("setPickup");
    expect(uber.searchParams.get("dropoff[latitude]")).toBe("6.4281");
    expect(uber.searchParams.get("dropoff[longitude]")).toBe("3.4216");
    expect(boltUrl(vi)).toBe("https://bolt.eu/en/rides/?dropoff_lat=6.4281&dropoff_lng=3.4216");
    expect(directionsUrl(vi)).toBe("https://www.google.com/maps/dir/?api=1&destination=6.4281,3.4216");
  });

  it("normalises Nigerian numbers to E.164 digits", () => {
    expect(normaliseNgPhone("0803 123 4567")).toBe("2348031234567");
    expect(normaliseNgPhone("+234 803-123-4567")).toBe("2348031234567");
    expect(normaliseNgPhone("2349031234567")).toBe("2349031234567");
    expect(normaliseNgPhone("+44 7700 900123")).toBe("447700900123");
    expect(normaliseNgPhone("12345")).toBeNull();
    expect(normaliseNgPhone(null)).toBeNull();
  });

  it("builds WhatsApp chat and share links", () => {
    expect(whatsappChatUrl("0803 123 4567", "Hi")).toBe("https://wa.me/2348031234567?text=Hi");
    expect(whatsappChatUrl("bad")).toBeNull();
    expect(whatsappShareUrl("Look: https://x.io/v/a b")).toBe("https://wa.me/?text=Look%3A%20https%3A%2F%2Fx.io%2Fv%2Fa%20b");
  });

  it("only allows http(s) outbound URLs and valid Instagram handles", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("https://venue.ng/book")).toBe("https://venue.ng/book");
    expect(instagramUrl("@indigo.tide")).toBe("https://instagram.com/indigo.tide");
    expect(instagramUrl("bad handle!")).toBeNull();
  });

  it("formats prices", () => {
    expect(formatNaira(0)).toBe("Free");
    expect(formatNaira(150000)).toBe("₦150,000");
    expect(priceBandSymbol("premium")).toBe("₦₦₦");
    expect(priceBandSymbol(null)).toBeNull();
  });
});
