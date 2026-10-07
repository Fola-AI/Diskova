import { getCityBySlug } from "@/lib/db/directory";
import { OG_SIZE, ogCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const city = await getCityBySlug((await params).city);
  return ogCard({
    eyebrow: "Tonight",
    title: city ? `What's on in ${city.name}` : "What's happening right now",
    subtitle: "Live crowd levels, prices and opening hours",
  });
}
