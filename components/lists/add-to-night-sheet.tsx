"use client";

import { Check, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { addToListAction, myListsAction, removeFromListAction } from "@/app/actions/lists";
import type { AddTarget } from "@/components/lists/add-to-night";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { trackEvent } from "@/lib/analytics";
import type { MyListSummary } from "@/lib/services/lists";

export function AddToNightSheet({ target, open, onOpenChange }: { target: AddTarget; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [lists, setLists] = useState<MyListSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const item = { vendorId: target.vendorId, eventId: target.eventId };

  useEffect(() => {
    void myListsAction(item).then((r) => {
      if (r.ok) setLists(r.lists);
      else if (r.needsLogin) window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      else setError(r.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.vendorId, target.eventId]);

  async function toggle(l: MyListSummary) {
    setBusy(l.id);
    setError(null);
    const r = l.has ? await removeFromListAction({ listId: l.id, ...item, token: l.share_token }) : await addToListAction({ listId: l.id, ...item });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setLists((cur) => cur?.map((x) => (x.id === l.id ? { ...x, has: !l.has, item_count: x.item_count + (l.has ? -1 : 1) } : x)) ?? null);
    if (!l.has) {
      trackEvent("list_item_added", { kind: target.vendorId ? "vendor" : "event" });
      toast.success(`Added to “${l.title}”`);
    }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy("new");
    setError(null);
    const r = await addToListAction({ newListTitle: title.trim(), cityId: target.cityId ?? null, ...item });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    trackEvent("list_created");
    toast.success(`Added to “${title.trim()}”`);
    setTitle("");
    const fresh = await myListsAction(item);
    if (fresh.ok) setLists(fresh.lists);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Add to my night" description={`Save ${target.name} to a list. Share it with friends when it's ready.`} data-testid="add-to-night-sheet">
        <div className="space-y-4">
          {error ? <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p> : null}
          <form onSubmit={(e) => void createAndAdd(e)} className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New list, e.g. Saturday in Lekki" aria-label="New list name" maxLength={80} />
            <Button type="submit" disabled={busy !== null || !title.trim()} loading={busy === "new"}>
              {busy === "new" ? null : <Plus aria-hidden />} Create
            </Button>
          </form>
          {lists === null ? (
            <div className="space-y-2" aria-hidden>
              {[0, 1].map((i) => <div key={i} className="skeleton h-14 rounded-2xl" />)}
              <p role="status" className="sr-only">Loading your lists…</p>
            </div>
          ) : (
            <ul className="surface divide-y overflow-hidden rounded-2xl">
              {lists.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => void toggle(l)} disabled={busy !== null} aria-pressed={l.has}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] transition-colors hover:bg-secondary/60 active:bg-secondary disabled:opacity-60">
                    <span className={l.has ? "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-positive text-background" : "h-6 w-6 shrink-0 rounded-full border-2 border-muted-foreground/40"} aria-hidden>
                      {busy === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : l.has ? <Check className="pop h-4 w-4" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{l.title}</span>
                    <span className="shrink-0 text-footnote text-muted-foreground">{l.item_count} {l.item_count === 1 ? "item" : "items"}</span>
                  </button>
                </li>
              ))}
              {!lists.length ? <li className="px-4 py-5 text-center text-sm text-muted-foreground">No lists yet — name your first one above.</li> : null}
            </ul>
          )}
          <Link href="/me/lists" className="flex min-h-11 items-center justify-center text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">Manage my lists</Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
