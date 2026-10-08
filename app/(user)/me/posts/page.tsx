import type { Metadata } from "next";
import Link from "next/link";

import { Radio } from "lucide-react";

import { MyPostRow } from "@/components/me/my-post-row";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "My posts", robots: { index: false } };

export default async function MyPostsPage() {
  const { supabase, user } = await requireUser("/me/posts");
  const { data } = await supabase
    .from("posts")
    .select("id, kind, crowd_level, body, status, hold_reason, created_at, vendor:vendors(slug, name)")
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const posts = (data ?? []) as unknown as Array<Parameters<typeof MyPostRow>[0]["post"]>;
  return (
    <div className="container max-w-2xl space-y-5 px-4 py-6">
      <div className="space-y-1">
        <Breadcrumbs items={[{ href: "/me", label: "Me" }, { label: "My posts" }]} />
        <h1 className="text-display font-semibold">My posts</h1>
        <p className="text-sm text-muted-foreground">Check-ins stay on your profile after they expire from a venue&apos;s live feed.</p>
      </div>
      {posts.length ? (
        <ul className="surface divide-y overflow-hidden rounded-2xl">{posts.map((p) => <MyPostRow key={p.id} post={p} />)}</ul>
      ) : (
        <EmptyState icon={Radio} title="No posts yet" action={<Button asChild><Link href="/">Find a venue</Link></Button>}>
          Find a venue and tap a crowd level — that&apos;s it.
        </EmptyState>
      )}
    </div>
  );
}
