import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CategoryIcon, categoryGradient } from "@/components/directory/category-icon";
import { OpenStatusBadge } from "@/components/directory/open-status-badge";
import type { VendorCardRow } from "@/lib/db/directory";
import { priceBandSymbol } from "@/lib/directory/constants";

export function VendorCard({ vendor, priority = false }: { vendor: VendorCardRow; priority?: boolean }) {
  const price = priceBandSymbol(vendor.price_band);
  return (
    <Link
      href={`/v/${vendor.slug}`}
      className="group block overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden" style={{ background: categoryGradient(vendor.category?.slug) }}>
        {vendor.cover_image_url ? (
          <Image
            src={vendor.cover_image_url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            priority={priority}
          />
        ) : (
          <CategoryIcon icon={vendor.category?.icon} className="absolute bottom-3 right-3 h-10 w-10 text-white/25" />
        )}
        {price ? (
          <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">
            {price}
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate font-sans text-base font-semibold tracking-normal">{vendor.name}</h3>
          {vendor.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-positive" aria-label="Verified venue" /> : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {[vendor.category?.name, vendor.area?.name].filter(Boolean).join(" · ")}
        </p>
        <OpenStatusBadge hours={vendor.opening_hours} />
      </div>
    </Link>
  );
}
