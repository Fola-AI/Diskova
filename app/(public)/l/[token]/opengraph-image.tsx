import { OG_SIZE, ogCard } from "@/lib/og/card";
import { getSharedList } from "@/lib/services/lists";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const list = await getSharedList((await params).token);
  if (!list) return ogCard({ title: "What's happening right now" });
  return ogCard({
    eyebrow: list.city ? `A plan for ${list.city.name}` : "A night out, planned",
    title: list.title,
    subtitle: `${list.items.length} stop${list.items.length === 1 ? "" : "s"} · by @${list.owner.username}`,
  });
}
