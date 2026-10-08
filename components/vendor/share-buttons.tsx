"use client";

import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { whatsappShareUrl } from "@/lib/directory/links";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * WhatsApp share, native share sheet (when supported) and copy link (§8.2).
 * `compact` keeps visible labels short on phones; accessible names stay descriptive.
 */
export function ShareButtons({ url, title, text, compact = false, className }: { url: string; title: string; text: string; compact?: boolean; className?: string }) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
      trackEvent("share_clicked", { channel: "native" });
    } catch {
      // user cancelled
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      trackEvent("share_clicked", { channel: "copy" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  const item = compact ? "flex-1 px-3" : "";
  return (
    <div className={cn("flex flex-wrap gap-2", compact && "flex-nowrap", className)}>
      <Button asChild variant="secondary" size="sm" className={item}>
        <a href={whatsappShareUrl(`${text} ${url}`)} target="_blank" rel="nofollow noopener noreferrer" aria-label="Share on WhatsApp" onClick={() => trackEvent("share_clicked", { channel: "whatsapp" })}>
          <MessageCircle aria-hidden /> {compact ? "Share" : "Share on WhatsApp"}
        </a>
      </Button>
      {canShare ? (
        <Button type="button" variant="secondary" size="sm" onClick={nativeShare} className={item} aria-label={compact ? "More sharing options" : undefined}>
          <Share2 aria-hidden /> {compact ? "More" : "Share"}
        </Button>
      ) : null}
      <Button type="button" variant="secondary" size="sm" onClick={copy} aria-label={copied ? "Copied" : "Copy link"} className={cn(item, copied && "text-positive")}>
        <span key={copied ? "y" : "n"} className="enter-fade inline-flex items-center gap-2">
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : compact ? "Copy" : "Copy link"}
        </span>
      </Button>
      <span className="sr-only" aria-live="polite">{copied ? "Link copied" : ""}</span>
    </div>
  );
}
