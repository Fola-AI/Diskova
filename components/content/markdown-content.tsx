import { Callout } from "@/components/content/embeds/callout";
import { MapEmbed, PriceTableEmbed, VendorEmbed } from "@/components/content/embeds/vendor-embeds";
import { markdownToHtml, parseBlocks } from "@/lib/content/markdown";

export const PROSE_CLASSES =
  "max-w-[68ch] space-y-4 text-[16px] leading-[1.7] text-foreground/85 [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/60 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h4]:font-semibold [&_h4]:text-foreground [&_hr]:my-8 [&_img]:rounded-xl [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-secondary [&_pre]:p-3 [&_strong]:text-foreground [&_ul]:list-disc";

/** Renders CMS markdown: sanitized HTML for text, React components for custom tags (§8.7). */
export function MarkdownContent({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);
  return (
    <div className={PROSE_CLASSES} data-testid="guide-body">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "markdown":
            return <div key={i} className="space-y-4" dangerouslySetInnerHTML={{ __html: markdownToHtml(b.text) }} />;
          case "callout":
            return <Callout key={i} variant={b.variant} text={b.text} />;
          case "vendor-card":
            return <VendorEmbed key={i} slug={b.slug} />;
          case "map":
            return <MapEmbed key={i} slugs={b.slugs} />;
          case "price-table":
            return <PriceTableEmbed key={i} vendor={b.vendor} />;
        }
      })}
    </div>
  );
}
