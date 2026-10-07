import { SEASON_NAME } from "@/lib/config";
import { OG_SIZE, ogCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({
    eyebrow: "Nigeria · live",
    title: "Where's the vibe right now?",
    subtitle: `Live venues, the ${SEASON_NAME} calendar, honest prices`,
  });
}
