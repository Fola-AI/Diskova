import { getVendorBySlug } from "@/lib/db/directory";
import { OG_SIZE, ogCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const vendor = await getVendorBySlug((await params).slug);
  if (!vendor) return ogCard({ title: "What's happening right now" });
  return ogCard({
    eyebrow: [vendor.category?.name, vendor.area?.name].filter(Boolean).join(" · "),
    title: vendor.name,
    subtitle: vendor.city ? `${vendor.city.name} · live crowd, prices & hours` : vendor.tagline ?? undefined,
  });
}
