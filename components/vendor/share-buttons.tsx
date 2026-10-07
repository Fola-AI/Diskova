"use client";

import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { whatsappShareUrl } from "@/lib/directory/links";
import { trackEvent } from "@/lib/analytics";

/** WhatsApp share, native share sheet (when supported) and copy link (§8.2). */
export function ShareButtons({ url, title, text }: { url: string; title: string; text: string }) {
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

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="secondary" size="sm">
        <a href={whatsappShareUrl(`${text} ${url}`)} target="_blank" rel="nofollow noopener noreferrer" onClick={() => trackEvent("share_clicked", { channel: "whatsapp" })}>
          <MessageCircle aria-hidden /> Share on WhatsApp
        </a>
      </Button>
      {canShare ? (
        <Button type="button" variant="secondary" size="sm" onClick={nativeShare}>
          <Share2 aria-hidden /> Share
        </Button>
      ) : null}
      <Button type="button" variant="secondary" size="sm" onClick={copy} aria-live="polite">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
