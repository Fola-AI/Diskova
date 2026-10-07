import type { Metadata } from "next";
import { Award } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PostCard } from "@/components/feed/post-card";
import { Avatar } from "@/components/me/avatar";
import { Badge } from "@/components/ui/badge";
import { getPublicSupabase } from "@/lib/db/public";
import { listUserPublicPosts } from "@/lib/db/feed";

export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

const getProfile = cache(async (username: string) => {
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username) || /^deleted_/i.test(username)) return null;
  const { data } = await getPublicSupabase()
    .from("v_public_profiles")
    .select("id, username, display_name, avatar_url, bio, badges, points, post_count")
    .eq("username", username)
    .maybeSingle();
  return data;
});

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProfile((await params).username);
  if (!p) return { title: "Not found" };
  return { title: `${p.display_name ?? p.username} (@${p.username})`, description: p.bio ?? undefined, robots: { index: false } };
}

export default async function PublicProfilePage({ params }: { params: Params }) {
  const p = await getProfile((await params).username);
  if (!p?.id) notFound();
  const posts = await listUserPublicPosts(p.id);
  const name = p.display_name ?? p.username ?? "";
  return (
    <div className="container max-w-2xl space-y-6 px-4 py-8">
      <header className="flex items-center gap-4">
        <Avatar url={p.avatar_url} name={name} size={72} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-muted-foreground">@{p.username}</p>
        </div>
      </header>
      {p.bio ? <p className="text-sm">{p.bio}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm"><Award className="h-4 w-4 text-accent" aria-hidden /><strong>{p.points}</strong> points</span>
        <span className="text-sm text-muted-foreground">· {p.post_count} posts</span>
        {(p.badges ?? []).map((b) => <Badge key={b} variant="gold">{b}</Badge>)}
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recent posts</h2>
        {posts.length ? (
          <ul className="space-y-3">{posts.map((post) => <PostCard key={post.id} post={post} liked={false} showVendor />)}</ul>
        ) : (
          <p className="text-sm text-muted-foreground">No public posts yet.</p>
        )}
      </section>
    </div>
  );
}
