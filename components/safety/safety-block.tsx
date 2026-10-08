import { ShieldCheck } from "lucide-react";

import { markdownToHtml } from "@/lib/content/markdown";
import type { SafetyBlock as Block } from "@/lib/db/safety";

/** One safety entry. Phone numbers in bold become tap-to-call links. Always shows its verification date. */
export function SafetyBlock({ block }: { block: Block }) {
  const html = markdownToHtml(block.body_md).replace(/<strong>(\+?[\d\s-]{3,15})<\/strong>/g, (_, n: string) => {
    const digits = n.replace(/[^\d+]/g, "");
    return `<a href="tel:${digits}" class="inline-flex min-h-10 items-center gap-1 rounded-full bg-primary/15 px-3.5 font-semibold text-positive no-underline align-middle">${n}</a>`;
  });
  const verified = block.last_verified_at
    ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(block.last_verified_at))
    : null;
  return (
    <div className="surface space-y-2 rounded-2xl p-4" data-testid="safety-block">
      <p className="text-callout font-semibold">{block.title}</p>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/80" dangerouslySetInnerHTML={{ __html: html }} />
      <p className="flex items-center gap-1.5 pt-1 text-footnote text-muted-foreground" data-testid="last-verified">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        {verified ? `Last verified: ${verified}` : "Last verified: not yet verified — please double-check"}
      </p>
    </div>
  );
}
