import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GuideArticle } from "@/components/content/guide-article";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { verifyPreviewToken } from "@/lib/content/preview-token";
import { guideHref, type GuideRow } from "@/lib/db/guides";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Draft preview", robots: { index: false, follow: false } };

/** Signed, expiring draft preview (§11.7). Anyone with a valid link (minted in the CMS) can view it for 1 h. */
export default async function GuidePreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ token?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !verifyPreviewToken(id, (await searchParams).token)) notFound();
  const { data } = await getAdminSupabase()
    .from("guides")
    .select("id, slug, type, title, excerpt, body_md, cover_image_url, tags, seo_title, seo_description, published_at, updated_at, status, city:cities(slug, name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const guide = data as unknown as GuideRow & { status: string };
  return (
    <GuideArticle
      guide={guide}
      path={guideHref(guide)}
      breadcrumb={<span>Draft preview</span>}
      banner={<div className="bg-accent px-4 py-2 text-center text-sm font-semibold text-accent-foreground">Draft preview — status: {guide.status}. Not visible to the public.</div>}
    />
  );
}
