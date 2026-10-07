import type { SearchHit } from "@/lib/db/directory";

export function searchHitHref(hit: Pick<SearchHit, "kind" | "slug">): string {
  switch (hit.kind) {
    case "vendor":
      return `/v/${hit.slug}`;
    case "event":
      return `/events/${hit.slug}`;
    case "guide":
      return `/guides/${hit.slug}`;
  }
}

export const SEARCH_KIND_LABEL: Record<SearchHit["kind"], string> = {
  vendor: "Place",
  event: "Event",
  guide: "Guide",
};
