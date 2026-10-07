/**
 * Outbound deep links (§8.2). Everything opens outside the site; no bookings happen here.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export function directionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function uberUrl({ lat, lng }: LatLng, nickname?: string): string {
  const params = new URLSearchParams({
    action: "setPickup",
    pickup: "my_location",
    "dropoff[latitude]": String(lat),
    "dropoff[longitude]": String(lng),
  });
  if (nickname) params.set("dropoff[nickname]", nickname);
  return `https://m.uber.com/ul/?${params.toString()}`;
}

/** Bolt web link (opens the app when installed; otherwise Bolt's web page). */
export function boltUrl({ lat, lng }: LatLng): string {
  return `https://bolt.eu/en/rides/?dropoff_lat=${lat}&dropoff_lng=${lng}`;
}

/**
 * Normalise a Nigerian phone number to E.164 digits without "+" (e.g. "2348031234567").
 * Accepts "+234 803…", "234803…", "0803…", "803…". Returns null if it doesn't look valid.
 */
export function normaliseNgPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  let national: string;
  if (digits.startsWith("234")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  if (!/^[789]\d{9}$/.test(national)) {
    // Non-Nigerian international numbers: accept 8–15 digits as-is.
    return /^\d{8,15}$/.test(digits) && !digits.startsWith("0") && input.trim().startsWith("+") ? digits : null;
  }
  return `234${national}`;
}

export function whatsappChatUrl(phone: string | null | undefined, text?: string): string | null {
  const e164 = normaliseNgPhone(phone);
  if (!e164) return null;
  return `https://wa.me/${e164}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function telUrl(phone: string | null | undefined): string | null {
  const e164 = normaliseNgPhone(phone);
  return e164 ? `tel:+${e164}` : null;
}

/** Only http(s) URLs are rendered as outbound links. */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function instagramUrl(handle: string | null | undefined): string | null {
  const h = handle?.trim().replace(/^@/, "");
  return h && /^[A-Za-z0-9._]{1,30}$/.test(h) ? `https://instagram.com/${h}` : null;
}

/** Static map image (Mapbox Static Images API) — a cheap first paint before the GL map loads. */
export function staticMapUrl(
  token: string,
  center: LatLng,
  opts: { zoom?: number; width?: number; height?: number; pin?: boolean; retina?: boolean } = {},
): string | null {
  if (!token) return null;
  const { zoom = 13, width = 600, height = 300, pin = false, retina = true } = opts;
  const overlay = pin ? `pin-l+0B7A3B(${center.lng},${center.lat})/` : "";
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlay}${center.lng},${center.lat},${zoom},0/${width}x${height}${retina ? "@2x" : ""}?access_token=${token}&attribution=false&logo=false`;
}
