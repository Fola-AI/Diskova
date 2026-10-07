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

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const g = await getPublishedGuide((await params).slug, ["blog"]);
  if (!g) return { title: "Not found" };
  const description = g.seo_description ?? g.excerpt ?? markdownToText(g.body_md, 160);
  return { title: g.seo_title ?? g.title, description, alternates: { canonical: `/blog/${g.slug}` }, openGraph: { title: g.title, description, type: "article" } };
}

export default async function BlogPage({ params }: { params: Params }) {
  const g = await getPublishedGuide((await params).slug, ["blog"]);
  if (!g) notFound();
  return <GuideArticle guide={g} path={`/blog/${g.slug}`} breadcrumb={<Link href="/blog" className="hover:underline">Blog</Link>} />;
}
