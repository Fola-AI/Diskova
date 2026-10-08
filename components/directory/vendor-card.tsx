import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CategoryIcon, categoryGradient } from "@/components/directory/category-icon";
import { OpenStatusBadge } from "@/components/directory/open-status-badge";
import type { VendorCardRow } from "@/lib/db/directory";
import { priceBandSymbol } from "@/lib/directory/constants";
import { AddToNight } from "@/components/lists/add-to-night";
import { cn } from "@/lib/utils";

/**
 * Venue card. `layout="row"` is the compact directory row on phones (72px thumbnail), which keeps
 * long city directories scannable; it becomes the regular card from `sm` up.
 */
export function VendorCard({
  vendor,
  priority = false,
  layout = "card",
}: {
  vendor: VendorCardRow;
  priority?: boolean;
  layout?: "card" | "row";
}) {
  const price = priceBandSymbol(vendor.price_band);
  const row = layout === "row";
  return (
    <div className="relative h-full">
      <Link
        href={`/v/${vendor.slug}`}
        className={cn(
          "surface pressable-soft group block h-full overflow-hidden rounded-2xl transition-[transform,border-color] duration-micro hover:border-primary/50 active:scale-[0.985]",
          row && "flex items-center gap-3 p-2.5 pr-14 sm:block sm:p-0 sm:pr-0",
        )}
      >
        <div
          className={cn(
            "relative shrink-0 overflow-hidden",
            row ? "h-[72px] w-[72px] rounded-xl sm:aspect-[16/10] sm:h-auto sm:w-full sm:rounded-none" : "aspect-[16/10] w-full",
          )}
          style={{ background: categoryGradient(vendor.category?.slug) }}
        >
          {vendor.cover_image_url ? (
            <Image
              src={vendor.cover_image_url}
              alt=""
              fill
              sizes={row ? "(max-width: 640px) 72px, (max-width: 1024px) 50vw, 33vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              priority={priority}
            />
          ) : (
            <CategoryIcon
              icon={vendor.category?.icon}
              className={cn("absolute text-white/30", row ? "inset-0 m-auto h-7 w-7 sm:inset-auto sm:bottom-3 sm:right-3 sm:m-0 sm:h-10 sm:w-10" : "bottom-3 right-3 h-10 w-10")}
            />
          )}
          {price ? (
            <span className={cn("absolute left-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-caption font-semibold text-white ring-1 ring-white/10 backdrop-blur-md", row && "hidden sm:inline")}>
              {price}
            </span>
          ) : null}
        </div>
        <div className={cn("min-w-0 space-y-1", row ? "flex-1 sm:p-3.5" : "p-3.5")}>
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-sans text-callout font-semibold tracking-normal">
              {vendor.name}
            </h3>
            {vendor.verified ? (
              <BadgeCheck className="h-4 w-4 shrink-0 text-positive" aria-label="Verified venue" />
            ) : null}
          </div>
          <p className="truncate text-footnote text-muted-foreground">
            {[vendor.category?.name, vendor.area?.name, row && price ? price : null].filter(Boolean).join(" · ")}
          </p>
          <OpenStatusBadge hours={vendor.opening_hours} />
        </div>
      </Link>
      {/* Outside the link (no nested interactive elements). */}
      <AddToNight
        compact
        target={{ vendorId: vendor.id, name: vendor.name }}
        className={cn("absolute", row ? "right-2 top-1/2 -translate-y-1/2 bg-secondary text-foreground hover:bg-secondary/70 sm:right-2.5 sm:top-2.5 sm:translate-y-0 sm:bg-black/55 sm:text-white" : "right-2.5 top-2.5")}
      />
    </div>
  );
}
