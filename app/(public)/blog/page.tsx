import type { Metadata } from "next";

import { GuideCard } from "@/components/content/guide-card";
import { BRAND_NAME } from "@/lib/config";
import { listPublishedGuides } from "@/lib/db/guides";

export const revalidate = 300;
export const metadata: Metadata = { title: "Blog", description: `Stories and news from ${BRAND_NAME}.`, alternates: { canonical: "/blog" } };

export default async function BlogIndex() {
  const posts = await listPublishedGuides({ types: ["blog"], limit: 50 });
  return (
    <div className="container max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-display font-semibold sm:text-display-lg">Blog</h1>
      {posts.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{posts.map((g) => <li key={g.id}><GuideCard guide={g} /></li>)}</ul>
      ) : (
        <p className="text-sm text-muted-foreground">No posts yet.</p>
      )}
    </div>
  );
}
