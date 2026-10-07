import { CalendarClock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { MarkdownContent } from "@/components/content/markdown-content";
import { Badge } from "@/components/ui/badge";
import { ShareButtons } from "@/components/vendor/share-buttons";
import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { guideJsonLd, jsonLdScript } from "@/lib/content/jsonld";
import type { GuideRow } from "@/lib/db/guides";

export function GuideArticle({ guide, path, breadcrumb, banner }: { guide: GuideRow; path: string; breadcrumb: ReactNode; banner?: ReactNode }) {
  const url = `${SITE_URL}${path}`;
  const updated = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(guide.updated_at));
  return (
    <article className="pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(guideJsonLd(guide, url)) }} />
      {banner}
      {guide.cover_image_url ? (
        <div className="relative aspect-[16/9] max-h-[420px] w-full overflow-hidden">
          <Image src={guide.cover_image_url} alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="container max-w-2xl space-y-6 px-4 pt-6">
        <nav className="text-sm text-muted-foreground">{breadcrumb}</nav>
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">{guide.title}</h1>
          {guide.excerpt ? <p className="text-lg text-muted-foreground">{guide.excerpt}</p> : null}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="last-updated">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Last updated {updated}
          </p>
          {guide.tags.length ? (
            <div className="flex flex-wrap gap-1.5">{guide.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
          ) : null}
        </header>
        <MarkdownContent markdown={guide.body_md} />
        <ShareButtons url={url} title={guide.title} text={`${guide.title} — ${BRAND_NAME}`} />
        <p className="text-xs text-muted-foreground">
          Spotted something out of date? <Link href="/guidelines" className="underline">Let us know</Link>.
        </p>
      </div>
    </article>
  );
}
