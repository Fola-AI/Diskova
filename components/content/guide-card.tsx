import Image from "next/image";
import Link from "next/link";

import { categoryGradient } from "@/components/directory/category-icon";
import { guideHref, type GuideRow } from "@/lib/db/guides";

export function GuideCard({ guide }: { guide: GuideRow }) {
  return (
    <Link href={guideHref(guide)} className="surface pressable-soft group block h-full overflow-hidden rounded-2xl transition-[transform,border-color] duration-micro hover:border-primary/50 active:scale-[0.985]" data-testid="guide-card">
      <div className="relative aspect-[16/9] overflow-hidden" style={{ background: categoryGradient(guide.slug) }}>
        {guide.cover_image_url ? <Image src={guide.cover_image_url} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" /> : null}
      </div>
      <div className="space-y-1 p-3.5">
        <p className="text-callout font-semibold leading-snug">{guide.title}</p>
        {guide.excerpt ? <p className="line-clamp-2 text-sm text-muted-foreground">{guide.excerpt}</p> : null}
      </div>
    </Link>
  );
}
