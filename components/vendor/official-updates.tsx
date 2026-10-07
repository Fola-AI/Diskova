import { formatDistanceToNowStrict } from "date-fns";
import { BadgeCheck, Megaphone } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { publicStorageUrl } from "@/lib/config";
import type { OfficialUpdateRow } from "@/lib/db/directory";
import { crowdClass, crowdLabel } from "@/lib/directory/crowd";
import { cn } from "@/lib/utils";

/** Official updates pinned at the top of the venue page for 24 h (§8.2). */
export function OfficialUpdates({ updates, verified }: { updates: OfficialUpdateRow[]; verified: boolean }) {
  if (!updates.length) return null;
  return (
    <section aria-labelledby="official-heading" className="space-y-3">
      <h2 id="official-heading" className="flex items-center gap-2 text-xl font-semibold">
        <Megaphone className="h-5 w-5 text-accent" aria-hidden /> Live from the venue
      </h2>
      <ul className="space-y-3">
        {updates.map((u) => {
          const photo = u.media[0];
          return (
            <li key={u.id} className="overflow-hidden rounded-xl border border-accent/40 bg-card" data-testid="official-update">
              {photo ? (
                <div className="relative aspect-[4/3] w-full bg-secondary">
                  <Image src={publicStorageUrl("media", photo.storage_path)} alt="Official photo from the venue" fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />
                </div>
              ) : null}
              <div className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold" className="gap-1">
                    {verified ? <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> : null}
                    {verified ? "Official · Verified vendor" : "Official"}
                  </Badge>
                  {u.crowd_level ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                      <span className={cn("h-2.5 w-2.5 rounded-full", crowdClass(u.crowd_level))} aria-hidden />
                      {crowdLabel(u.crowd_level)}
                    </span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(u.created_at), { addSuffix: true })}
                  </span>
                </div>
                {u.body ? <p className="text-sm">{u.body}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
