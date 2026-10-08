"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { sendMagicLink, signInWithPassword } from "@/app/(auth)/actions";
import { EmailField, PasswordField } from "@/components/auth/fields";
import { FormAlert } from "@/components/forms/form-alert";
import { initialFormState } from "@/components/forms/form-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction] = useActionState(signInWithPassword, initialFormState);
  const [mlState, mlAction] = useActionState(sendMagicLink, initialFormState);

  if (mode === "magic") {
    return (
      <form action={mlAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormAlert state={mlState} />
        <EmailField id="ml-email" serverErrors={mlState.fieldErrors?.email} autoFocus />
        <SubmitButton className="w-full" size="lg" pendingText="Sending…">Email me a sign-in link</SubmitButton>
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
      <EmailField serverErrors={pwState.fieldErrors?.email} />
      <PasswordField
        autoComplete="current-password"
        serverErrors={pwState.fieldErrors?.password}
        aside={
          <Link href="/reset" className="-my-2 inline-flex h-10 items-center text-footnote text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        }
      />
      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Sign in</SubmitButton>
      <Button type="button" variant="link" className="w-full" onClick={() => setMode("magic")}>
        Email me a sign-in link instead
      </Button>
    </form>
  );
}
