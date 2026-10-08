"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { FieldError } from "@/components/forms/form-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Email field with inline validation on blur (UX only — the server validates again).
 * One error slot: the server's message wins, so the same error never shows twice.
 */
export function EmailField({ id = "email", serverErrors, autoFocus }: { id?: string; serverErrors?: string[]; autoFocus?: boolean }) {
  const [clientError, setClientError] = useState<string | null>(null);
  const errors = serverErrors?.length ? serverErrors : clientError ? [clientError] : undefined;
  const errId = `${id}-error`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Email</Label>
      <Input
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus={autoFocus}
        required
        aria-invalid={Boolean(errors) || undefined}
        aria-describedby={errors ? errId : undefined}
        onBlur={(e) => {
          const v = e.target.value.trim();
          setClientError(v && !EMAIL_RE.test(v) ? "Enter a valid email address." : null);
        }}
        onChange={(e) => {
          if (clientError && EMAIL_RE.test(e.target.value.trim())) setClientError(null);
        }}
      />
      <FieldError id={errId} errors={errors} />
    </div>
  );
}

const RULES = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "Uppercase", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Lowercase", test: (v: string) => /[a-z]/.test(v) },
  { label: "Number", test: (v: string) => /\d/.test(v) },
];

/** Password with a show/hide toggle (44px) and, for new passwords, a live checklist instead of a wall of rules. */
export function PasswordField({
  id = "password",
  name = "password",
  label = "Password",
  autoComplete,
  serverErrors,
  checklist = false,
  aside,
}: {
  id?: string;
  name?: string;
  label?: string;
  autoComplete: "current-password" | "new-password";
  serverErrors?: string[];
  checklist?: boolean;
  aside?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  const helpId = useId();
  const errId = `${id}-error`;
  const describedBy = [checklist ? helpId : null, serverErrors?.length ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          required
          className="pr-12"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={Boolean(serverErrors?.length) || undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-controls={id}
          aria-label={show ? "Hide" : "Show"}
          className="pressable absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
        </button>
      </div>
      {checklist ? (
        <ul id={helpId} className="flex flex-wrap gap-1.5" aria-label="Requirements">
          {RULES.map((r) => {
            const ok = r.test(value);
            return (
              <li
                key={r.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium transition-colors duration-micro",
                  ok ? "bg-primary/15 text-positive" : "bg-secondary text-muted-foreground",
                )}
              >
                {ok ? <Check className="pop h-3 w-3" aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden />}
                {r.label}
                <span className="sr-only">{ok ? " — done" : " — needed"}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <FieldError id={errId} errors={serverErrors} />
    </div>
  );
}
