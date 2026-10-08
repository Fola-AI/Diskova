import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { FormState } from "@/components/forms/form-state";
import { cn } from "@/lib/utils";

export function FormAlert({ state, className }: { state: FormState; className?: string }) {
  if (!state.error && !state.message) return null;
  const isError = Boolean(state.error);
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "enter-up flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
        isError ? "border-destructive/50 bg-destructive/10 text-foreground" : "border-primary/40 bg-primary/10",
        className,
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden />
      )}
      <span>{state.error ?? state.message}</span>
    </div>
  );
}

export function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="enter-fade flex items-start gap-1.5 text-footnote text-destructive">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      {errors[0]}
    </p>
  );
}
