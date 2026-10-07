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
        <div className="space-y-3">
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          {lists === null ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your lists…</p>
          ) : (
            <ul className="space-y-1.5">
              {lists.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => void toggle(l)} disabled={busy !== null} aria-pressed={l.has}
                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/60 disabled:opacity-60">
                    <span className={l.has ? "grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground" : "h-5 w-5 rounded border"} aria-hidden>
                      {busy === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : l.has ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="flex-1 font-medium">{l.title}</span>
                    <span className="text-xs text-muted-foreground">{l.item_count} {l.item_count === 1 ? "item" : "items"}</span>
                  </button>
                </li>
              ))}
              {!lists.length ? <li className="text-sm text-muted-foreground">No lists yet — name your first one below.</li> : null}
            </ul>
          )}
          <form onSubmit={(e) => void createAndAdd(e)} className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New list, e.g. Saturday in Lekki" aria-label="New list name" maxLength={80} />
            <Button type="submit" disabled={busy !== null || !title.trim()}>
              {busy === "new" ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />} Create
            </Button>
          </form>
          <Link href="/me/lists" className="block text-center text-sm text-muted-foreground underline underline-offset-4">Manage my lists</Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
