import { formatDistanceToNowStrict } from "date-fns";

import { ReportButton } from "@/components/feed/report-button";
import { crowdLabel } from "@/lib/directory/crowd";

/** §8.2.8: venue staff can flag community posts that aren't from their venue (→ P2 vendor_dispute). */
export function DisputeList({ posts }: { posts: Array<{ id: string; kind: string; crowd_level: number | null; body: string | null; created_at: string; author: { username: string } | null }> }) {
  if (!posts.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-title font-semibold">Community posts on your page</h2>
      <p className="text-sm text-muted-foreground">If one isn&apos;t from your venue, tell us — we review every dispute.</p>
      <ul className="divide-y rounded-xl border">
        {posts.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm" data-testid="dispute-post">
            <span className="min-w-0">
              <span className="font-medium">@{p.author?.username ?? "someone"}</span> · {crowdLabel(p.crowd_level)}
              {p.body ? <span className="block truncate text-muted-foreground">{p.body}</span> : null}
              <span className="block text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(p.created_at), { addSuffix: true })}</span>
            </span>
            <ReportButton entityType="post" entityId={p.id} label="Not ours" presetReason="wrong_venue" title="This post is not from our venue" />
          </li>
        ))}
      </ul>
    </section>
  );
}
