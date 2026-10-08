import type { Metadata } from "next";
import { Bookmark, ChevronRight, Globe2, Lock } from "lucide-react";
import Link from "next/link";

import { NewListForm } from "@/components/lists/list-manager";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireUser } from "@/lib/auth/guards";
import { listMyLists } from "@/lib/services/lists";

export const metadata: Metadata = { title: "My lists", robots: { index: false } };

/** P2 — the user's saved lists ("Plan my night"). */
export default async function MyListsPage() {
  const session = await requireUser("/me/lists");
  const lists = await listMyLists(session);
  return (
    <div className="container max-w-2xl space-y-5 px-4 py-6">
      <div className="space-y-1">
        <Breadcrumbs items={[{ href: "/me", label: "Me" }, { label: "My lists" }]} />
        <h1 className="text-display font-semibold">My lists</h1>
        <p className="text-sm text-muted-foreground">Plan a night out, then share it with friends. Tap “Add to my night” on any venue or event.</p>
      </div>
      <NewListForm />
      <ul className="space-y-2" data-testid="my-lists">
        {lists.map((l) => (
          <li key={l.id}>
            <Link href={`/me/lists/${l.id}`} className="surface pressable-soft flex min-h-16 items-center gap-3 rounded-2xl p-4 transition-colors hover:border-primary/50">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${l.is_public ? "bg-primary/15 text-positive" : "bg-secondary text-muted-foreground"}`}>
                {l.is_public ? <Globe2 className="h-5 w-5" aria-label="Shared" /> : <Lock className="h-5 w-5" aria-label="Private" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{l.title}</span>
                <span className="block text-footnote text-muted-foreground">{l.item_count} {l.item_count === 1 ? "item" : "items"} · {l.is_public ? "Shared" : "Private"}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
        {!lists.length ? (
          <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <Bookmark className="h-6 w-6" aria-hidden />
            No lists yet. Name one above, or tap the bookmark on any venue.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
