"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { createTask, moveTask } from "@/lib/services/admin/tasks";

export async function createTaskForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("moderator", "/admin/tasks");
  try {
    await createTask(session, Object.fromEntries(formData), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/tasks");
  return { ok: true, message: "Task created." };
}

export async function moveTaskForm(formData: FormData): Promise<void> {
  const session = await requireRole("moderator", "/admin/tasks");
  const status = formData.get("status");
  if (status !== "todo" && status !== "doing" && status !== "done") return;
  await moveTask(session, String(formData.get("id")), status, await requestMeta());
  revalidatePath("/admin/tasks");
}
