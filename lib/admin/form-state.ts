import { ZodError } from "zod";

import type { FormState } from "@/components/forms/form-state";
import { AdminActionError } from "@/lib/services/admin/vendors";

/** Map a service error to a form message without leaking internals. */
export function toFormState(err: unknown): FormState {
  if (err instanceof ZodError) return { error: err.issues[0]?.message ?? "Invalid input." };
  if (err instanceof AdminActionError) return { error: err.message };
  if (err instanceof Error && /^(Add a note|Couldn't|Only )/.test(err.message)) return { error: err.message };
  console.error(err);
  return { error: "Action failed." };
}
