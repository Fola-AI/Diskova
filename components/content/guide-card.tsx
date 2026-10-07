import Image from "next/image";
import Link from "next/link";

import { categoryGradient } from "@/components/directory/category-icon";
import { guideHref, type GuideRow } from "@/lib/db/guides";

export function GuideCard({ guide }: { guide: GuideRow }) {
  return (
    <Link href={guideHref(guide)} className="group block overflow-hidden rounded-xl border bg-card hover:border-primary/60" data-testid="guide-card">
      <div className="relative aspect-[16/9]" style={{ background: categoryGradient(guide.slug) }}>
        {guide.cover_image_url ? <Image src={guide.cover_image_url} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" /> : null}
      </div>
      <div className="space-y-1 p-3">
        <p className="font-semibold leading-snug">{guide.title}</p>
        {guide.excerpt ? <p className="line-clamp-2 text-sm text-muted-foreground">{guide.excerpt}</p> : null}
      </div>
    </Link>
  );
}
