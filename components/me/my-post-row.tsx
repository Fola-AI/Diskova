"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { deleteMyPostAction } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { crowdClass, crowdLabel } from "@/lib/directory/crowd";
import { deferWithUndo } from "@/lib/client/deferred";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; tone: string }> = {
  published: { label: "Live", tone: "bg-primary/15 text-positive" },
  pending: { label: "In review", tone: "bg-accent/15 text-accent" },
  hidden: { label: "Hidden while we review it", tone: "bg-secondary text-muted-foreground" },
  removed: { label: "Removed", tone: "bg-destructive/15 text-destructive" },
};

export function MyPostRow({
  post,
}: {
  post: { id: string; kind: string; crowd_level: number | null; body: string | null; status: string; hold_reason: string; created_at: string; vendor: { slug: string; name: string } | null };
}) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const s = STATUS[post.status];
  const status = post.status === "pending" && post.hold_reason !== "none" ? "Your photo is being reviewed — usually under an hour" : s?.label ?? post.status;
  return (
    <li className="enter-up flex items-center gap-3 px-4 py-3 text-sm" data-testid="my-post">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary" aria-hidden>
        <span className={cn("h-3 w-3 rounded-full ring-[3px] ring-white/10", crowdClass(post.crowd_level))} />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-semibold">
          {post.vendor ? <Link href={`/v/${post.vendor.slug}`} className="hover:underline">{post.vendor.name}</Link> : "Venue"}
        </p>
        <p className="truncate text-footnote text-muted-foreground">
          {post.kind === "pulse" ? "Pulse" : post.kind === "official" ? "Official update" : "Check-in"} · {crowdLabel(post.crowd_level)} · {formatDistanceToNowStrict(new Date(post.created_at), { addSuffix: true })}
        </p>
        {post.body ? <p className="truncate text-footnote text-foreground/80">{post.body}</p> : null}
        <p>
          <span data-testid="my-post-status" className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-semibold", s?.tone ?? "bg-secondary text-muted-foreground")}>{status}</span>
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        aria-label="Delete post"
        onClick={() => {
          setGone(true);
          deferWithUndo({ message: "Post deleted", commit: () => deleteMyPostAction(post.id), undo: () => setGone(false) });
        }}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
