"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Clock, MapPin, Ticket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { LikeButton } from "@/components/feed/like-button";
import { LazyReportButton as ReportButton } from "@/components/feed/lazy";
import { Avatar } from "@/components/me/avatar";
import { UNVERIFIED_LABEL } from "@/lib/config";
import { formatNaira } from "@/lib/directory/constants";
import { crowdClass, crowdLabel } from "@/lib/directory/crowd";
import type { FeedPost } from "@/lib/db/feed";
import { cn } from "@/lib/utils";
import { VIBES } from "@/lib/validation/constants";

export function PostCard({ post, liked, showVendor }: { post: FeedPost & { vendor?: { slug: string; name: string } | null }; liked: boolean; showVendor?: boolean }) {
  const name = post.author?.display_name ?? post.author?.username ?? "Community member";
  const when = formatDistanceToNowStrict(new Date(post.created_at), { addSuffix: true });
  const vibe = VIBES.find((v) => v.level === post.vibe)?.label;

  if (post.kind === "pulse") {
    return (
      <li className="surface enter-up flex items-center gap-3 rounded-2xl px-4 py-3 text-sm" data-testid="feed-post" data-kind="pulse">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary" aria-hidden>
          <span className={cn("h-3 w-3 rounded-full ring-[3px] ring-white/10", crowdClass(post.crowd_level))} />
        </span>
        <span className="min-w-0 flex-1">
          {post.author ? <Link href={`/u/${post.author.username}`} className="font-medium hover:underline">@{post.author.username}</Link> : "Someone"}
          {" says it's "}<strong>{crowdLabel(post.crowd_level)?.toLowerCase()}</strong>
          {post.is_at_venue ? <MapPin className="ml-1 inline h-3.5 w-3.5 text-positive" aria-label="At the venue" /> : null}
          <span className="mt-0.5 block text-footnote text-muted-foreground">
            {when}{showVendor && post.vendor ? <> · <Link href={`/v/${post.vendor.slug}`} className="hover:underline">{post.vendor.name}</Link></> : null} · {UNVERIFIED_LABEL}
          </span>
        </span>
      </li>
    );
  }

  return (
    <li className="surface enter-up overflow-hidden rounded-2xl" data-testid="feed-post" data-kind={post.kind}>
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar url={post.author?.avatar_url} name={name} size={36} />
        <div className="min-w-0 flex-1 text-sm">
          {post.author ? (
            <Link href={`/u/${post.author.username}`} className="font-medium hover:underline">{name}</Link>
          ) : (
            <span className="font-medium">{name}</span>
          )}
          <span className="block text-footnote text-muted-foreground">
            {when}
            {showVendor && post.vendor ? <> · <Link href={`/v/${post.vendor.slug}`} className="hover:underline">{post.vendor.name}</Link></> : null}
          </span>
        </div>
        {post.crowd_level ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-caption font-semibold">
            <span className={cn("h-2.5 w-2.5 rounded-full", crowdClass(post.crowd_level))} aria-hidden />
            {crowdLabel(post.crowd_level)}
          </span>
        ) : null}
      </div>

      {post.media.length ? (
        <div className={cn("mt-3 grid gap-0.5", post.media.length > 1 && "grid-cols-2")}>
          {post.media.map((m, i) => (
            <div key={m.url} className={cn("relative bg-secondary", post.media.length === 3 && i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square", post.media.length === 1 && "aspect-[4/3]")}>
              <Image src={m.url} alt="Community photo" fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" {...(m.placeholder ? { placeholder: "blur" as const, blurDataURL: m.placeholder } : {})} />
              {i === 0 ? (
                <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2.5 py-1 text-caption font-medium text-white ring-1 ring-white/10 backdrop-blur-md">Community photo · Unverified</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 px-4 py-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-footnote text-muted-foreground">
          {vibe ? <span>Vibe: <span className="text-foreground">{vibe}</span></span> : null}
          {post.wait_minutes !== null ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{post.wait_minutes ? `${post.wait_minutes} min wait` : "No wait"}</span> : null}
          {post.cover_fee_ngn !== null ? <span className="inline-flex items-center gap-1"><Ticket className="h-3.5 w-3.5" aria-hidden />{post.cover_fee_ngn ? `Entry ${formatNaira(post.cover_fee_ngn)}` : "Free entry"}</span> : null}
          {post.is_at_venue ? <span className="inline-flex items-center gap-1 text-positive"><MapPin className="h-3.5 w-3.5" aria-hidden />At the venue</span> : null}
        </div>
        {post.body ? <p className="whitespace-pre-line text-[15px] leading-relaxed">{post.body}</p> : null}
        {!post.verified ? <p className="text-caption text-muted-foreground">{UNVERIFIED_LABEL}</p> : null}
      </div>
      <div className="flex items-center justify-between border-t px-1.5 py-1">
        <LikeButton postId={post.id} count={post.like_count} liked={liked} />
        <ReportButton entityType="post" entityId={post.id} />
      </div>
    </li>
  );
}
