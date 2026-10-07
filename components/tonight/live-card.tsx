import { formatDistanceToNowStrict } from "date-fns";
import { BadgeCheck, Megaphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { categoryGradient } from "@/components/directory/category-icon";
import { CrowdBadge } from "@/components/tonight/crowd-badge";
import type { LiveVenue } from "@/lib/db/live";
import { priceBandSymbol, type PriceBand } from "@/lib/directory/constants";

function activityLine(v: LiveVenue): string {
  const official = v.last_official_update_at ? new Date(v.last_official_update_at) : null;
  if (official && Date.now() - official.getTime() < 90 * 60_000) {
    return `Official update ${formatDistanceToNowStrict(official)} ago`;
  }
  const last = v.last_activity_at ? formatDistanceToNowStrict(new Date(v.last_activity_at)) : null;
  const n = v.post_count;
  return `${n} check-in${n === 1 ? "" : "s"}${last ? ` · ${last} ago` : ""}`;
}

export function LiveCard({ venue, areaName, priority = false }: { venue: LiveVenue; areaName?: string | null; priority?: boolean }) {
  const price = priceBandSymbol(venue.price_band as PriceBand | null);
  const isOfficial = activityLine(venue).startsWith("Official");
  return (
    <Link
      href={`/v/${venue.slug}`}
      className="group block w-64 shrink-0 overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/60 sm:w-72"
      data-testid="live-card"
    >
      <div className="relative aspect-[4/3]" style={{ background: categoryGradient(venue.slug) }}>
        {venue.photo_url ? (
          <Image src={venue.photo_url} alt="" fill sizes="288px" className="object-cover" priority={priority} />
        ) : null}
        <CrowdBadge level={venue.crowd_level_avg} confidence={venue.confidence} className="absolute left-2 top-2" />
        {price ? <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{price}</span> : null}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="flex items-center gap-1 truncate font-semibold">
          {venue.name}
          {venue.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-positive" aria-label="Verified" /> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">{areaName ?? venue.tagline ?? ""}</p>
        <p className="flex items-center gap-1 text-xs">
          {isOfficial ? <Megaphone className="h-3 w-3 text-accent" aria-hidden /> : null}
          {activityLine(venue)}
        </p>
      </div>
    </Link>
  );
}
