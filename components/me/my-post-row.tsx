"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { deleteMyPostAction } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { crowdLabel } from "@/lib/directory/crowd";

const STATUS: Record<string, string> = {
  published: "Live",
  pending: "In review",
  hidden: "Hidden while we review it",
  removed: "Removed",
};

export function MyPostRow({
  post,
}: {
  post: { id: string; kind: string; crowd_level: number | null; body: string | null; status: string; hold_reason: string; created_at: string; vendor: { slug: string; name: string } | null };
}) {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const status = post.status === "pending" && post.hold_reason !== "none" ? "Your photo is being reviewed — usually under an hour" : STATUS[post.status] ?? post.status;
  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3 text-sm" data-testid="my-post">
      <div className="min-w-0">
        <p className="font-medium">
          {post.vendor ? <Link href={`/v/${post.vendor.slug}`} className="hover:underline">{post.vendor.name}</Link> : "Venue"}
          <span className="font-normal text-muted-foreground"> · {post.kind === "pulse" ? "Pulse" : post.kind === "official" ? "Official update" : "Check-in"} · {crowdLabel(post.crowd_level)}</span>
        </p>
        {post.body ? <p className="truncate text-muted-foreground">{post.body}</p> : null}
        <p className="text-xs text-muted-foreground">
          <span data-testid="my-post-status">{status}</span> · {formatDistanceToNowStrict(new Date(post.created_at), { addSuffix: true })}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" aria-label="Delete post" onClick={async () => {
        const res = await deleteMyPostAction(post.id);
        if (res.ok) setGone(true); else toast.error(res.error);
      }}>
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
