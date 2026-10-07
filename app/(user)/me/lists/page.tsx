import type { Metadata } from "next";
import { Globe2, Lock } from "lucide-react";
import Link from "next/link";

import { NewListForm } from "@/components/lists/list-manager";
import { requireUser } from "@/lib/auth/guards";
import { listMyLists } from "@/lib/services/lists";

export const metadata: Metadata = { title: "My lists", robots: { index: false } };

/** P2 — the user's saved lists ("Plan my night"). */
export default async function MyListsPage() {
  const session = await requireUser("/me/lists");
  const lists = await listMyLists(session);
  return (
    <div className="container max-w-2xl space-y-5 px-4 py-8">
      <div>
        <Link href="/me" className="text-xs text-muted-foreground underline-offset-4 hover:underline">← Me</Link>
        <h1 className="text-3xl font-semibold">My lists</h1>
        <p className="text-sm text-muted-foreground">Plan a night out, then share it with friends. Tap “Add to my night” on any venue or event.</p>
      </div>
      <NewListForm />
      <ul className="space-y-2" data-testid="my-lists">
        {lists.map((l) => (
          <li key={l.id}>
            <Link href={`/me/lists/${l.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/60">
              {l.is_public ? <Globe2 className="h-4 w-4 text-positive" aria-label="Shared" /> : <Lock className="h-4 w-4 text-muted-foreground" aria-label="Private" />}
              <span className="flex-1 font-medium">{l.title}</span>
              <span className="text-sm text-muted-foreground">{l.item_count} {l.item_count === 1 ? "item" : "items"}</span>
            </Link>
          </li>
        ))}
        {!lists.length ? <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No lists yet.</li> : null}
      </ul>
    </div>
  );
}
