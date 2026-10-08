"use server";

import { z, ZodError } from "zod";

import { getSession } from "@/lib/auth/guards";
import { getPublicSupabase } from "@/lib/db/public";
import { EventError, submitEvent } from "@/lib/services/events";
import { fieldErrors } from "@/lib/validation/auth";

export async function venuesForCityAction(cityId: string): Promise<Array<{ id: string; name: string }>> {
  if (!z.uuid().safeParse(cityId).success) return [];
  const { data } = await getPublicSupabase()
    .from("vendors")
    .select("id, name")
    .eq("city_id", cityId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("name")
    .limit(1000);
  return data ?? [];
}

export async function submitEventAction(
  input: unknown,
): Promise<{ ok: true; slug: string } | { ok: false; error: string; fieldErrors?: Record<string, string[]>; needsLogin?: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to submit an event.", needsLogin: true };
  if (!session.profile.email_verified_at || ["suspended", "banned"].includes(session.profile.status)) {
    return { ok: false, error: "Your account can't submit events right now." };
  }
  try {
    const res = await submitEvent(session, input);
    return { ok: true, slug: res.slug };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(err) };
    if (err instanceof EventError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
