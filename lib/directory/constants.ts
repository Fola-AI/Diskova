import type { Database } from "@/lib/db/types";

export type PriceBand = Database["public"]["Enums"]["price_band"];

export const PRICE_BANDS: Array<{ value: PriceBand; label: string; symbol: string }> = [
  { value: "free", label: "Free", symbol: "Free" },
  { value: "budget", label: "Budget", symbol: "₦" },
  { value: "mid", label: "Mid-range", symbol: "₦₦" },
  { value: "premium", label: "Premium", symbol: "₦₦₦" },
  { value: "luxury", label: "Luxury", symbol: "₦₦₦₦" },
];

export function priceBandSymbol(band: PriceBand | null | undefined): string | null {
  return PRICE_BANDS.find((p) => p.value === band)?.symbol ?? null;
}

/** Vendor feature vocabulary (vendors.features). Unknown keys are ignored in the UI. */
export const FEATURES: Record<string, string> = {
  live_music: "Live music",
  dj: "DJ",
  late_night: "Open late",
  vip_area: "VIP area",
  rooftop: "Rooftop",
  outdoor_seating: "Outdoor seating",
  sea_view: "Sea view",
  food_served: "Food served",
  reservations: "Takes reservations",
  card_payments: "Cards accepted",
  wifi: "Wi-Fi",
  air_conditioned: "Air-conditioned",
  parking: "Parking",
  wheelchair_access: "Wheelchair access",
  family_friendly: "Family friendly",
};

export const FEATURE_KEYS = Object.keys(FEATURES);

export function formatNaira(amount: number): string {
  if (amount === 0) return "Free";
  return `₦${amount.toLocaleString("en-NG")}`;
}
