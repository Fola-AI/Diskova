"use client";

import { Radio, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { myLikesAction } from "@/app/actions/posts";
import { PostCard } from "@/components/feed/post-card";
import { OfficialUpdates } from "@/components/vendor/official-updates";
import type { OfficialUpdateRow } from "@/lib/db/directory";
import type { FeedPost } from "@/lib/db/feed";
import { hasAuthCookie } from "@/lib/client/auth-cookie";

const POLL_MS = 15_000; // anonymous visitors: ≤ 30 s freshness with the ~10 s CDN cache

interface FeedPayload {
  feed: FeedPost[];
  official: OfficialUpdateRow[];
}

/**
 * Venue live feed (§8.2.4). Signed-in visitors get Supabase Realtime (≤ 2 s); anonymous visitors poll
 * the cached JSON endpoint. supabase-js is only downloaded for signed-in visitors.
 */
export function LiveFeed({
  vendorId,
  vendorSlug,
  verified,
  initial,
}: {
  vendorId: string;
  vendorSlug: string;
  verified: boolean;
  initial: FeedPayload;
}) {
  const [data, setData] = useState<FeedPayload>(initial);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(
    async (fresh: boolean) => {
      try {
        const res = await fetch(`/api/live/v/${vendorSlug}${fresh ? `?t=${Date.now()}` : ""}`, { cache: fresh ? "no-store" : "default" });
        if (res.ok) setData((await res.json()) as FeedPayload);
      } catch {
        // offline — keep what we have
      }
    },
    [vendorSlug],
  );

  // Expose a hook for the pulse / check-in components to refresh immediately after posting.
  useEffect(() => {
    const onPosted = () => void refetch(true);
    window.addEventListener("feed:posted", onPosted);
    return () => window.removeEventListener("feed:posted", onPosted);
  }, [refetch]);

  useEffect(() => {
    if (!hasAuthCookie()) {
      const id = setInterval(() => {
        if (document.visibilityState === "visible") void refetch(false);
      }, POLL_MS);
      return () => clearInterval(id);
    }
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void (async () => {
      const { getBrowserSupabase } = await import("@/lib/db/client");
      if (cancelled) return;
      const supabase = getBrowserSupabase();
      const channel = supabase
        .channel(`vendor-feed:${vendorId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `vendor_id=eq.${vendorId}` }, () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void refetch(true), 250);
        })
        // "SUBSCRIBED" only means the channel joined; changes flow once Postgres confirms.
        .on("system", {}, (payload: { extension?: string; status?: string }) => {
          if (payload?.extension === "postgres_changes" && payload?.status === "ok") setLive(true);
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") setLive(false);
        });
      cleanup = () => void supabase.removeChannel(channel);
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [vendorId, refetch]);

  useEffect(() => {
    if (!hasAuthCookie() || !data.feed.length) return;
    void myLikesAction(data.feed.map((p) => p.id)).then((ids) => setLiked(new Set(ids)));
  }, [data.feed]);

  return (
    <div className="space-y-6" data-testid="live-feed" data-live={live ? "realtime" : "polling"}>
      <OfficialUpdates updates={data.official} verified={verified} />
      <section aria-labelledby="feed-heading" className="space-y-3">
        <h2 id="feed-heading" className="flex items-center gap-2 text-title font-semibold">
          <Radio className="h-5 w-5 text-positive" aria-hidden /> Right now
          {live ? (
            <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 font-sans text-caption font-semibold text-positive">
              <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-positive" aria-hidden /> Live
            </span>
          ) : null}
        </h2>
        {data.feed.length ? (
          <ul className="space-y-3" aria-live="polite" aria-relevant="additions">
            {data.feed.map((p) => (
              <PostCard key={p.id} post={p} liked={liked.has(p.id)} />
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            <Users className="h-5 w-5 shrink-0" aria-hidden />
            No one has checked in recently. Be the first — tap a crowd level above.
          </p>
        )}
      </section>
    </div>
  );
}
