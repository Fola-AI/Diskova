import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ListEditor, type EditorItem } from "@/components/lists/list-manager";
import { requireUser } from "@/lib/auth/guards";
import { SITE_URL } from "@/lib/config";
import { getMyList } from "@/lib/services/lists";

export const metadata: Metadata = { title: "Edit list", robots: { index: false } };

export default async function EditListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser(`/me/lists/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const list = await getMyList(session, id);
  if (!list) notFound();
  const items = (list.items as unknown as Array<{ id: string; note: string | null; vendor: { slug: string; name: string; tagline: string | null } | null; event: { slug: string; title: string; starts_at: string } | null }>).map(
    (i): EditorItem => ({ id: i.id, note: i.note, href: i.vendor ? `/v/${i.vendor.slug}` : `/events/${i.event?.slug}`, title: i.vendor?.name ?? i.event?.title ?? "Removed", subtitle: i.vendor?.tagline ?? (i.event ? new Date(i.event.starts_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) : null) }),
  );
  return (
    <div className="container max-w-2xl space-y-5 px-4 py-8">
      <Link href="/me/lists" className="text-xs text-muted-foreground underline-offset-4 hover:underline">← My lists</Link>
      <ListEditor list={{ id: list.id, title: list.title, isPublic: list.is_public, token: list.share_token, views: list.view_count }} items={items} shareUrl={`${SITE_URL}/l/${list.share_token}`} />
    </div>
  );
}
