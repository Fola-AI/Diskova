import { getPublishedGuide } from "@/lib/db/guides";
import { OG_SIZE, ogCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const g = await getPublishedGuide((await params).slug, ["blog"]);
  return ogCard({ eyebrow: g?.city?.name ?? "Guide", title: g?.title ?? "Guides", subtitle: g?.excerpt ?? undefined });
}
