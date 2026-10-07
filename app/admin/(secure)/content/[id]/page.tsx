import Link from "next/link";
import { notFound } from "next/navigation";

import { GuideEditor } from "@/components/admin/guide-editor";
import { requireRole } from "@/lib/auth/guards";
import { createPreviewToken } from "@/lib/content/preview-token";
import { listCities } from "@/lib/db/directory";
import { guideHref } from "@/lib/db/guides";
import { getGuideAdmin } from "@/lib/services/admin/content";

export default async function EditGuidePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin", "/admin/content");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [data, cities] = await Promise.all([getGuideAdmin(id), listCities()]);
  if (!data) notFound();
  const g = data.guide;
  const city = g.city as unknown as { slug: string } | null;
  return (
    <div className="space-y-4">
      <Link href="/admin/content" className="text-sm text-muted-foreground hover:underline">← Content</Link>
      <h1 className="text-2xl font-semibold">{g.title}</h1>
      <GuideEditor
        id={g.id}
        status={g.status}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        revisions={data.revisions.map((r) => ({ id: r.id, saved_at: r.saved_at }))}
        previewHref={`/preview/guide/${g.id}?token=${encodeURIComponent(createPreviewToken(g.id))}`}
        publicHref={guideHref({ type: g.type, slug: g.slug, city })}
        initial={{
          title: g.title, slug: g.slug, type: g.type, city_id: g.city_id ?? "", excerpt: g.excerpt ?? "", body_md: g.body_md,
          cover_image_url: g.cover_image_url ?? "", tags: g.tags.join(", "), seo_title: g.seo_title ?? "", seo_description: g.seo_description ?? "",
        }}
      />
    </div>
  );
}
