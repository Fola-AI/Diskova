import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { assertServerOnly } from "@/lib/server-only";
import type { StaffMeta } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/tasks");

export const taskSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional().transform((v) => v || null),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  assigned_to: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
  due_at: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().transform((v) => (v ? `${v}T17:00:00+01:00` : null)),
  related_entity_type: z.string().max(40).optional().transform((v) => v || null),
  related_entity_id: z.union([z.uuid(), z.literal("")]).optional().transform((v) => v || null),
});

export async function listTasks() {
  const { data } = await getAdminSupabase()
    .from("admin_tasks")
    .select("id, title, description, priority, status, due_at, completed_at, created_at, related_entity_type, related_entity_id, assignee:profiles!admin_tasks_assigned_to_fkey(username), creator:profiles!admin_tasks_created_by_fkey(username)")
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(500);
  return data ?? [];
}

export async function createTask(session: SessionContext, raw: unknown, meta: StaffMeta): Promise<string> {
  const input = taskSchema.parse(raw);
  const { data, error } = await getAdminSupabase().from("admin_tasks").insert({ ...input, created_by: session.user.id }).select("id").single();
  if (error || !data) throw new Error("Couldn't create the task.");
  await writeAudit({ action: "task.created", entityType: "public.admin_tasks", entityId: data.id, after: { title: input.title }, actorId: session.user.id, actorRole: session.profile.role, ...meta });
  return data.id;
}

export async function moveTask(session: SessionContext, id: string, status: "todo" | "doing" | "done", meta: StaffMeta): Promise<void> {
  await getAdminSupabase().from("admin_tasks").update({ status, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", z.uuid().parse(id));
  await writeAudit({ action: `task.${status}`, entityType: "public.admin_tasks", entityId: id, actorId: session.user.id, actorRole: session.profile.role, ...meta });
}

export async function listStaff() {
  const { data } = await getAdminSupabase().from("profiles").select("id, username, role").in("role", ["moderator", "admin", "super_admin"]).is("deleted_at", null).order("username");
  return data ?? [];
}
