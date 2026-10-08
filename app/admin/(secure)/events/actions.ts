"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import type { FormState } from "@/components/forms/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { toFormState } from "@/lib/admin/form-state";
import { adminEditEvent, decideEvent, type EventAdminAction } from "@/lib/services/admin/events";
import { AdminActionError } from "@/lib/services/admin/vendors";

const ACTIONS: EventAdminAction[] = ["approve", "reject", "feature", "unfeature", "cancel"];

export async function eventDecisionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/events");
  const action = String(formData.get("decision")) as EventAdminAction;
  if (!ACTIONS.includes(action)) return { error: "Unknown action." };
  try {
    await decideEvent(session, String(formData.get("eventId")), action, String(formData.get("reason") ?? "") || null, await requestMeta());
  } catch (err) {
    if (err instanceof ZodError) return { error: err.issues[0]?.message ?? "Invalid input." };
    if (err instanceof AdminActionError) return { error: err.message };
    console.error(err);
    return { error: "Action failed." };
  }
  revalidatePath("/admin/events");
  return { ok: true, message: "Done." };
}

export async function editEventForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/events");
  const eventId = String(formData.get("eventId") ?? "");
  try {
    await adminEditEvent(session, eventId, Object.fromEntries(formData), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/events");
  return { ok: true, message: "Event saved." };
}
