"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { toggleLikeAction } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LikeButton({ postId, count, liked: initialLiked }: { postId: string; count: number; liked: boolean }) {
  const [liked, setLiked] = useState(initialLiked);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        setLiked(!liked);
        setN(n + (liked ? -1 : 1));
        const res = await toggleLikeAction(postId);
        setBusy(false);
        if (!res.ok) {
          setLiked(liked);
          setN(n);
          if (res.needsLogin) window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
          else toast.error(res.error);
          return;
        }
        setLiked(res.liked);
        setN(res.count);
      }}
    >
      <Heart className={cn(liked && "fill-current text-destructive")} aria-hidden /> {n > 0 ? n : ""}
    </Button>
  );
}
