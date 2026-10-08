"use client";

import { ArrowDown, ArrowUp, Check, ExternalLink, Globe2, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createListAction, deleteListAction, removeFromListAction, updateItemAction, updateListAction } from "@/app/actions/lists";
import { Button } from "@/components/ui/button";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ShareButtons } from "@/components/vendor/share-buttons";
import { deferWithUndo } from "@/lib/client/deferred";
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
      <Button type="submit" disabled={!title.trim()} loading={pending}>{pending ? null : <Plus aria-hidden />}Create</Button>
    </form>
  );
}

export interface EditorItem { id: string; note: string | null; href: string; title: string; subtitle: string | null }

export function ListEditor({ list, items, shareUrl }: { list: { id: string; title: string; isPublic: boolean; token: string; views: number }; items: EditorItem[]; shareUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(list.title);
  const [editing, setEditing] = useState(false);
  const [isPublic, setIsPublic] = useState(list.isPublic); // optimistic; reverted if the save fails
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Something went wrong.");
      if (done) toast.success(done);
      router.refresh();
    });
  const visible = items.filter((i) => !hidden.has(i.id));

  return (
    <div className="space-y-6" data-testid="list-editor">
      {editing ? (
        <form
          className="enter-fade flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
            if (title.trim() && title !== list.title) run(() => updateListAction({ listId: list.id, title, token: list.token }), "Saved");
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { setTitle(list.title); setEditing(false); } }} aria-label="List name" maxLength={80} className="h-12 text-lg font-semibold" autoFocus />
          <Button type="submit" size="icon" className="h-12 w-12" aria-label="Save name"><Check aria-hidden /></Button>
          <Button type="button" size="icon" variant="secondary" className="h-12 w-12" aria-label="Cancel" onClick={() => { setTitle(list.title); setEditing(false); }}><X aria-hidden /></Button>
        </form>
      ) : (
        <div className="flex items-start gap-2">
          <h1 className="min-w-0 flex-1 text-display font-semibold">{title}</h1>
          <Button type="button" variant="secondary" size="icon" className="mt-0.5 rounded-full" aria-label="Rename list" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
          </Button>
        </div>
      )}

      <section className="surface space-y-4 rounded-2xl p-4">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="flex items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isPublic ? "bg-primary/15 text-positive" : "bg-secondary text-muted-foreground"}`}>
              <Globe2 className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">Anyone with the link can view</span>
              <span id="share-help" className="block text-footnote text-muted-foreground">Shows your username, the list and your notes. {isPublic ? `${list.views} views` : ""}</span>
            </span>
          </span>
          <Switch checked={isPublic} disabled={pending} data-testid="list-public-toggle" aria-describedby="share-help"
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
          <div className="enter-up space-y-3 border-t pt-4" onClickCapture={() => trackEvent("list_shared")}>
            <code className="block break-all rounded-xl bg-secondary/70 px-3 py-2.5 font-mono text-footnote" data-testid="list-share-url">{shareUrl}</code>
            <ShareButtons url={shareUrl} title={list.title} text={`My plan: ${list.title} —`} />
            <Link href={`/l/${list.token}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium underline underline-offset-4">
              <ExternalLink className="h-4 w-4" aria-hidden /> Open the shared page
            </Link>
          </div>
        ) : null}
      </section>

      <ol className="space-y-2.5" data-testid="list-items">
        {visible.map((it, i) => (
          <li key={it.id} className="surface enter-up space-y-3 rounded-2xl p-3.5">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary font-display text-sm font-semibold text-muted-foreground" aria-hidden>{i + 1}</span>
              <div className="min-w-0 flex-1 pt-1">
                <Link href={it.href} className="font-semibold underline-offset-4 hover:underline">{it.title}</Link>
                {it.subtitle ? <p className="truncate text-footnote text-muted-foreground">{it.subtitle}</p> : null}
              </div>
            </div>
            <NoteField itemId={it.id} note={it.note} token={list.token} />
            <div className="flex items-center gap-1 border-t pt-2">
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Move ${it.title} up`} disabled={pending || i === 0} onClick={() => run(() => updateItemAction({ itemId: it.id, move: "up", token: list.token }))}><ArrowUp aria-hidden /></Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label={`Move ${it.title} down`} disabled={pending || i === visible.length - 1} onClick={() => run(() => updateItemAction({ itemId: it.id, move: "down", token: list.token }))}><ArrowDown aria-hidden /></Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${it.title}`}
                disabled={pending}
                onClick={() => {
                  setHidden((h) => new Set(h).add(it.id));
                  deferWithUndo({
                    message: `Removed ${it.title}`,
                    commit: async () => {
                      const r = await removeFromListAction({ listId: list.id, itemId: it.id, token: list.token });
                      if (r.ok) router.refresh();
                      return r;
                    },
                    undo: () => setHidden((h) => { const n = new Set(h); n.delete(it.id); return n; }),
                  });
                }}
              >
                <Trash2 aria-hidden /> Remove
              </Button>
            </div>
          </li>
        ))}
        {!visible.length ? <li className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Empty — tap the bookmark on venues and events to add them.</li> : null}
      </ol>

      <Button type="button" variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={pending} onClick={() => setConfirmDelete(true)}>
        <Trash2 aria-hidden /> Delete list
      </Button>
      <ConfirmSheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this list?"
        description={`“${list.title}” and its notes are deleted for good. If it was shared, the link stops working.`}
        confirmLabel="Delete list"
        pending={pending}
        onConfirm={() => start(async () => { const r = await deleteListAction({ listId: list.id, token: list.token }); if (r.ok) router.push("/me/lists"); else toast.error(r.error); })}
      />
    </div>
  );
}

function NoteField({ itemId, note, token }: { itemId: string; note: string | null; token: string }) {
  const [value, setValue] = useState(note ?? "");
  const [saved, setSaved] = useState(note ?? "");
  const [pending, start] = useTransition();
  const dirty = value !== saved;
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateItemAction({ itemId, note: value, token }); if (r.ok) { setSaved(value); toast.success("Note saved"); } else toast.error(r.error); }); }}>
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add a note (e.g. arrive before 11)" aria-label="Note" maxLength={280} className="h-10 text-sm" />
      {dirty ? <Button type="submit" size="sm" variant="secondary" loading={pending} className="enter-fade">Save</Button> : null}
    </form>
  );
}
