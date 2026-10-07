"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { sendMagicLink, signInWithPassword } from "@/app/(auth)/actions";
import { FieldError, FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction] = useActionState(signInWithPassword, initialFormState);
  const [mlState, mlAction] = useActionState(sendMagicLink, initialFormState);

  if (mode === "magic") {
    return (
      <form action={mlAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormAlert state={mlState} />
        <div className="space-y-2">
          <Label htmlFor="ml-email">Email</Label>
          <Input id="ml-email" name="email" type="email" autoComplete="email" inputMode="email" required
            aria-invalid={Boolean(mlState.fieldErrors?.email)} />
          <FieldError errors={mlState.fieldErrors?.email} />
        </div>
        <SubmitButton className="w-full" pendingText="Sending…">Email me a sign-in link</SubmitButton>
        <Button type="button" variant="link" className="w-full" onClick={() => setMode("password")}>
          Use a password instead
        </Button>
      </form>
    );
  }

  return (
    <form action={pwAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert state={pwState} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required
          aria-invalid={Boolean(pwState.fieldErrors?.email)} />
        <FieldError errors={pwState.fieldErrors?.email} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/reset" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required
          aria-invalid={Boolean(pwState.fieldErrors?.password)} />
        <FieldError errors={pwState.fieldErrors?.password} />
      </div>
      <SubmitButton className="w-full" pendingText="Signing in…">Sign in</SubmitButton>
      <Button type="button" variant="link" className="w-full" onClick={() => setMode("magic")}>
        Email me a sign-in link instead
      </Button>
    </form>
  );
}
