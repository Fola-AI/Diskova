import { formatDistanceToNowStrict } from "date-fns";
import { BadgeCheck, Megaphone, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { categoryGradient } from "@/components/directory/category-icon";
import { CrowdBadge } from "@/components/tonight/crowd-badge";
import type { LiveVenue } from "@/lib/db/live";
import { priceBandSymbol, type PriceBand } from "@/lib/directory/constants";
import { cn } from "@/lib/utils";

function activityLine(v: LiveVenue): string {
  const official = v.last_official_update_at ? new Date(v.last_official_update_at) : null;
  if (official && Date.now() - official.getTime() < 90 * 60_000) {
    return `Official update ${formatDistanceToNowStrict(official)} ago`;
  }
  const last = v.last_activity_at ? formatDistanceToNowStrict(new Date(v.last_activity_at)) : null;
  const n = v.post_count;
  return `${n} check-in${n === 1 ? "" : "s"}${last ? ` · ${last} ago` : ""}`;
}

/** Live venue card. `wide` fills the row (used when only one venue is live). */
export function LiveCard({ venue, areaName, priority = false, wide = false }: { venue: LiveVenue; areaName?: string | null; priority?: boolean; wide?: boolean }) {
  const price = priceBandSymbol(venue.price_band as PriceBand | null);
  const line = activityLine(venue);
  const isOfficial = line.startsWith("Official");
  return (
    <Link
      href={`/v/${venue.slug}`}
      className={cn(
        "surface pressable-soft group block shrink-0 overflow-hidden rounded-2xl transition-[transform,border-color] duration-micro hover:border-primary/50 active:scale-[0.985]",
        wide ? "w-full" : "w-[17rem] sm:w-72",
      )}
      data-testid="live-card"
    >
      <div className={cn("relative", wide ? "aspect-[16/9] sm:aspect-[21/9]" : "aspect-[4/3]")} style={{ background: categoryGradient(venue.slug) }}>
        {venue.photo_url ? (
          <Image src={venue.photo_url} alt="" fill sizes={wide ? "(max-width: 640px) 100vw, 1100px" : "288px"} className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" priority={priority} {...(venue.photo_placeholder ? { placeholder: "blur" as const, blurDataURL: venue.photo_placeholder } : {})} />
        ) : null}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
        <CrowdBadge level={venue.crowd_level_avg} confidence={venue.confidence} className="absolute left-2.5 top-2.5" />
        {price ? <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2.5 py-1 text-caption font-semibold text-white ring-1 ring-white/10 backdrop-blur-md">{price}</span> : null}
      </div>
      <div className="space-y-1 p-3.5">
        <p className="flex items-center gap-1 truncate text-callout font-semibold">
          <span className="truncate">{venue.name}</span>
          {venue.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-positive" aria-label="Verified" /> : null}
        </p>
        <p className="truncate text-footnote text-muted-foreground">{areaName ?? venue.tagline ?? ""}</p>
        <p className={cn("flex items-center gap-1.5 text-footnote", isOfficial ? "text-accent" : "text-foreground/85")}>
          {isOfficial ? <Megaphone className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
          <span className="truncate">{line}</span>
        </p>
      </div>
    </Link>
  );
}
