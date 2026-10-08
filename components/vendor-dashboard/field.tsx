import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { nativeSelectClass } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const selectClass = nativeSelectClass;

export function Field({
  id,
  label,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  errors?: string[];
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p id={`${id}-hint`} className="text-footnote text-muted-foreground">{hint}</p> : null}
      {errors?.length ? (
        <p id={`${id}-error`} role="alert" className="enter-fade flex items-start gap-1.5 text-footnote text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
