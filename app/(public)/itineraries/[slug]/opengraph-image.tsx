import { OG_SIZE, ogCard } from "@/lib/og/card";
import { getPublishedItinerary } from "@/lib/services/itineraries";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const it = await getPublishedItinerary((await params).slug);
  if (!it) return ogCard({ title: "What's happening right now" });
  return ogCard({ eyebrow: `${it.days}-day itinerary${it.city ? ` · ${it.city.name}` : ""}`, title: it.title, subtitle: it.excerpt ?? undefined });
}
