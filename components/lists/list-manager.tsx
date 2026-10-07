"use client";

import { ArrowDown, ArrowUp, Globe2, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createListAction, deleteListAction, removeFromListAction, updateItemAction, updateListAction } from "@/app/actions/lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShareButtons } from "@/components/vendor/share-buttons";
import { trackEvent } from "@/lib/analytics";

export function NewListForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createListAction({ title });
          if (!r.ok) return void toast.error(r.error);
          trackEvent("list_created");
          setTitle("");
          router.push(`/me/lists/${r.id}`);
        });
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New list, e.g. Friday on the Island" aria-label="New list name" maxLength={80} required />
      <Button type="submit" disabled={pending || !title.trim()}>{pending ? <Loader2 className="animate-spin" aria-hidden /> : null}Create</Button>
    </form>
  );
}

export interface EditorItem { id: string; note: string | null; href: string; title: string; subtitle: string | null }

export function ListEditor({ list, items, shareUrl }: { list: { id: string; title: string; isPublic: boolean; token: string; views: number }; items: EditorItem[]; shareUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(list.title);
  const [isPublic, setIsPublic] = useState(list.isPublic); // optimistic; reverted if the save fails
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Something went wrong.");
      if (done) toast.success(done);
      router.refresh();
    });

  return (
    <div className="space-y-6" data-testid="list-editor">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => updateListAction({ listId: list.id, title, token: list.token }), "Saved"); }}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="List name" maxLength={80} className="text-lg font-semibold" />
        <Button type="submit" variant="secondary" disabled={pending || title === list.title}>Rename</Button>
      </form>

      <section className="space-y-3 rounded-xl border p-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="flex items-center gap-1.5 font-medium"><Globe2 className="h-4 w-4" aria-hidden /> Anyone with the link can view</span>
            <span className="text-xs text-muted-foreground">Shows your username, the list and your notes. {isPublic ? `${list.views} views` : ""}</span>
          </span>
          <input type="checkbox" className="h-5 w-5" checked={isPublic} disabled={pending} data-testid="list-public-toggle"
            onChange={(e) => {
              const next = e.target.checked;
              setIsPublic(next);
              start(async () => {
                const r = await updateListAction({ listId: list.id, isPublic: next, token: list.token });
                if (!r.ok) {
                  setIsPublic(!next);
                  return void toast.error(r.error);
                }
                toast.success(next ? "Link is live" : "List is private");
                router.refresh();
              });
            }} />
        </label>
        {isPublic ? (
          <div className="space-y-2" onClickCapture={() => trackEvent("list_shared")}>
            <code className="block break-all rounded bg-secondary px-2 py-1 text-xs" data-testid="list-share-url">{shareUrl}</code>
            <ShareButtons url={shareUrl} title={list.title} text={`My plan: ${list.title} —`} />
            <Link href={`/l/${list.token}`} className="text-sm underline underline-offset-4">Open the shared page</Link>
          </div>
        ) : null}
      </section>

      <ol className="space-y-2" data-testid="list-items">
        {items.map((it, i) => (
          <li key={it.id} className="space-y-2 rounded-xl border bg-card p-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 w-5 text-sm text-muted-foreground">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <Link href={it.href} className="font-medium underline-offset-4 hover:underline">{it.title}</Link>
                {it.subtitle ? <p className="truncate text-xs text-muted-foreground">{it.subtitle}</p> : null}
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Move up" disabled={pending || i === 0} onClick={() => run(() => updateItemAction({ itemId: it.id, move: "up", token: list.token }))}><ArrowUp aria-hidden /></Button>
              <Button type="button" size="icon" variant="ghost" aria-label="Move down" disabled={pending || i === items.length - 1} onClick={() => run(() => updateItemAction({ itemId: it.id, move: "down", token: list.token }))}><ArrowDown aria-hidden /></Button>
              <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${it.title}`} disabled={pending} onClick={() => run(() => removeFromListAction({ listId: list.id, itemId: it.id, token: list.token }))}><Trash2 aria-hidden /></Button>
            </div>
            <NoteField itemId={it.id} note={it.note} token={list.token} />
          </li>
        ))}
        {!items.length ? <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Empty — tap “Add to my night” on venues and events.</li> : null}
      </ol>

      <Button type="button" variant="ghost" className="text-destructive" disabled={pending}
        onClick={() => { if (window.confirm("Delete this list?")) start(async () => { const r = await deleteListAction({ listId: list.id, token: list.token }); if (r.ok) router.push("/me/lists"); else toast.error(r.error); }); }}>
        <Trash2 aria-hidden /> Delete list
      </Button>
    </div>
  );
}

function NoteField({ itemId, note, token }: { itemId: string; note: string | null; token: string }) {
  const [value, setValue] = useState(note ?? "");
  const [pending, start] = useTransition();
  return (
    <form className="flex gap-2 pl-7" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateItemAction({ itemId, note: value, token }); if (r.ok) toast.success("Note saved"); else toast.error(r.error); }); }}>
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add a note (e.g. arrive before 11)" aria-label="Note" maxLength={280} className="h-9 text-sm" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending || value === (note ?? "")}>Save</Button>
    </form>
  );
}
