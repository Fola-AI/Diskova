import { format } from "date-fns";
import Link from "next/link";

import { moveTaskForm } from "@/app/admin/(secure)/tasks/actions";
import { TaskForm } from "@/components/admin/task-form";
import { Badge } from "@/components/ui/badge";
import { one, uuidParam, type SearchParams } from "@/lib/admin/params";
import { requireRole } from "@/lib/auth/guards";
import { listStaff, listTasks } from "@/lib/services/admin/tasks";

const COLUMNS = [
  { status: "todo", label: "To do" },
  { status: "doing", label: "Doing" },
  { status: "done", label: "Done" },
] as const;

/** §11.11 tasks kanban. Moves are plain form posts so they work without JS. */
export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireRole("moderator", "/admin/tasks");
  const sp = await searchParams;
  const [tasks, staff] = await Promise.all([listTasks(), listStaff()]);
  const entity = one(sp, "entity");
  const preset = { title: one(sp, "title"), entityType: entity === "vendor" ? "vendor" : entity === "user" ? "profile" : undefined, entityId: uuidParam(sp, "id") };
  const link = (t: { related_entity_type: string | null; related_entity_id: string | null }) =>
    t.related_entity_id ? (t.related_entity_type === "vendor" ? `/admin/vendors/${t.related_entity_id}` : t.related_entity_type === "profile" ? `/admin/users/${t.related_entity_id}` : null) : null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <section className="rounded-xl border p-4"><TaskForm staff={staff} preset={preset} /></section>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.status).slice(0, col.status === "done" ? 30 : 200);
          return (
            <section key={col.status} className="space-y-2 rounded-xl bg-secondary/40 p-3" data-testid={`task-col-${col.status}`}>
              <h2 className="text-sm font-semibold">{col.label} ({items.length})</h2>
              <ul className="space-y-2">
                {items.map((t) => {
                  const rel = link(t);
                  const assignee = (t as unknown as { assignee: { username: string } | null }).assignee;
                  return (
                    <li key={t.id} className="space-y-1.5 rounded-lg border bg-background p-3 text-sm" data-testid="task-card">
                      <div className="flex items-start gap-2">
                        <span className="flex-1 font-medium">{t.title}</span>
                        <Badge variant={t.priority === "urgent" ? "destructive" : t.priority === "high" ? "gold" : "outline"}>{t.priority}</Badge>
                      </div>
                      {t.description ? <p className="whitespace-pre-line text-xs text-muted-foreground">{t.description}</p> : null}
                      <p className="text-xs text-muted-foreground">
                        {assignee ? `@${assignee.username}` : "unassigned"}
                        {t.due_at ? ` · due ${format(new Date(t.due_at), "d MMM")}` : ""}
                        {rel ? <> · <Link href={rel} className="underline">related</Link></> : null}
                      </p>
                      <form action={moveTaskForm} className="flex gap-1">
                        <input type="hidden" name="id" value={t.id} />
                        {COLUMNS.filter((c) => c.status !== col.status).map((c) => (
                          <button key={c.status} type="submit" name="status" value={c.status} className="rounded border px-2 py-0.5 text-xs hover:bg-secondary">
                            → {c.label}
                          </button>
                        ))}
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
