import type { Metadata } from "next";
import Link from "next/link";

import { MyPostRow } from "@/components/me/my-post-row";
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
    <div className="container max-w-2xl space-y-5 px-4 py-8">
      <div>
        <Link href="/me" className="text-sm text-muted-foreground hover:underline">← Profile</Link>
        <h1 className="mt-2 text-3xl font-semibold">My posts</h1>
        <p className="text-sm text-muted-foreground">Check-ins stay on your profile after they expire from a venue&apos;s live feed.</p>
      </div>
      {posts.length ? (
        <ul className="divide-y rounded-xl border bg-card">{posts.map((p) => <MyPostRow key={p.id} post={p} />)}</ul>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No posts yet. Find a venue and tap a crowd level — that&apos;s it.
        </p>
      )}
    </div>
  );
}
