import { getEventBySlug } from "@/lib/db/events";
import { eventDateParts } from "@/lib/events/format";
import { OG_SIZE, ogCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const e = await getEventBySlug((await params).slug);
  if (!e) return ogCard({ title: "Events" });
  const d = eventDateParts(e.starts_at, e.timezone);
  return ogCard({ eyebrow: `${d.weekday} ${d.day} ${d.month} · ${d.time}`, title: e.title, subtitle: [e.venue?.name ?? e.venue_name_freeform, e.city?.name].filter(Boolean).join(" · ") });
}
