import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
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
      <h1 className="text-title font-semibold sm:text-display">Tasks</h1>
      <section className="surface space-y-3 rounded-2xl p-4">
        <h2 className="text-callout font-semibold">New task</h2>
        <TaskForm staff={staff} preset={preset} />
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.status).slice(0, col.status === "done" ? 30 : 200);
          return (
            <section key={col.status} className="space-y-3 rounded-2xl bg-secondary/40 p-3" data-testid={`task-col-${col.status}`}>
              <h2 className="flex items-center justify-between px-1 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {col.label} <span className="rounded-full bg-background px-2 py-0.5 tabular-nums">({items.length})</span>
              </h2>
              <ul className="space-y-2">
                {items.map((t) => {
                  const rel = link(t);
                  const assignee = (t as unknown as { assignee: { username: string } | null }).assignee;
                  return (
                    <li key={t.id} className="surface space-y-2 rounded-2xl p-3.5 text-sm" data-testid="task-card">
                      <div className="flex items-start gap-2">
                        <span className="flex-1 font-medium">{t.title}</span>
                        <Badge variant={t.priority === "urgent" ? "destructive" : t.priority === "high" ? "gold" : "outline"}>{t.priority}</Badge>
                      </div>
                      {t.description ? <p className="whitespace-pre-line text-footnote text-muted-foreground">{t.description}</p> : null}
                      <p className="text-footnote text-muted-foreground">
                        {assignee ? `@${assignee.username}` : "unassigned"}
                        {t.due_at ? ` · due ${format(new Date(t.due_at), "d MMM")}` : ""}
                        {rel ? <> · <Link href={rel} className="font-semibold text-positive underline underline-offset-4">related</Link></> : null}
                      </p>
                      <form action={moveTaskForm} className="flex flex-wrap gap-2 border-t pt-2">
                        <input type="hidden" name="id" value={t.id} />
                        {COLUMNS.filter((c) => c.status !== col.status).map((c) => (
                          <button key={c.status} type="submit" name="status" value={c.status} className="pressable hit inline-flex h-10 items-center gap-1 rounded-xl border px-3 text-footnote font-semibold hover:bg-secondary">
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden /><span className="sr-only">Move to</span> {c.label}
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
