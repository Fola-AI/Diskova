import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GuideArticle } from "@/components/content/guide-article";
import { markdownToText } from "@/lib/content/markdown";
import { getPublishedGuide } from "@/lib/db/guides";

export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ city: string; slug: string }>;

async function load(params: Params) {
  const { city, slug } = await params;
  const g = await getPublishedGuide(slug, ["city_guide", "area_guide", "daytime"]);
  return g && (g.city?.slug ?? "nigeria") === city ? g : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const g = await load(params);
  if (!g) return { title: "Not found" };
  const description = g.seo_description ?? g.excerpt ?? markdownToText(g.body_md, 160);
  return { title: g.seo_title ?? g.title, description, alternates: { canonical: `/guides/${g.city?.slug ?? "nigeria"}/${g.slug}` }, openGraph: { title: g.title, description, type: "article" } };
}

export default async function GuidePage({ params }: { params: Params }) {
  const g = await load(params);
  if (!g) notFound();
  const citySlug = g.city?.slug ?? "nigeria";
  return (
    <GuideArticle
      guide={g}
      path={`/guides/${citySlug}/${g.slug}`}
      crumbs={[{ name: "Guides", path: "/guides" }, { name: g.city?.name ?? "Nigeria", path: `/guides/${citySlug}` }]}
      breadcrumb={<><Link href="/guides" className="hover:underline">Guides</Link> / {g.city ? <Link href={`/guides/${citySlug}`} className="hover:underline">{g.city.name}</Link> : "Nigeria"}</>}
    />
  );
}
