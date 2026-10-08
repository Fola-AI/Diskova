"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { saveItinerary, setItineraryStatus } from "@/lib/services/itineraries";

export async function saveItineraryAction(input: unknown): Promise<FormState & { id?: string }> {
  const session = await requireRole("admin", "/admin/itineraries");
  try {
    const id = await saveItinerary(session, input, await requestMeta());
    revalidatePath("/admin/itineraries");
    return { ok: true, message: "Saved.", id };
  } catch (err) {
    return toFormState(err);
  }
}

export async function setItineraryStatusAction(id: string, status: "draft" | "published" | "archived"): Promise<FormState> {
  const session = await requireRole("admin", "/admin/itineraries");
  try {
    await setItineraryStatus(session, id, status, await requestMeta());
    revalidatePath("/admin/itineraries");
    revalidatePath(`/admin/itineraries/${id}`);
    return { ok: true, message: status === "published" ? "Published." : status === "archived" ? "Archived." : "Moved back to draft." };
  } catch (err) {
    return toFormState(err);
  }
}
