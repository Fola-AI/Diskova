"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms/form-state";
import { toFormState } from "@/lib/admin/form-state";
import { requireRole } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/http/request-meta";
import { saveArea, saveCity } from "@/lib/services/admin/cities";

const clean = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && !(k === "id" && v === "")));

export async function saveCityForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/cities");
  try {
    await saveCity(session, clean(formData), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/cities");
  return { ok: true, message: "City saved." };
}

export async function saveAreaForm(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("admin", "/admin/cities");
  try {
    await saveArea(session, clean(formData), await requestMeta());
  } catch (err) {
    return toFormState(err);
  }
  revalidatePath("/admin/cities");
  return { ok: true, message: "Area saved." };
}
