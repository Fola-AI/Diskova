import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";
import { OrDivider } from "@/components/auth/or-divider";
import { FormAlert } from "@/components/forms/form-alert";
import { safeNext } from "@/lib/auth/safe-next";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to check in, pulse a venue and save your plans."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {params.error === "link" ? (
        <FormAlert
          className="mb-4"
          state={{ error: "That link has expired or was already used. Please sign in or request a new one." }}
        />
      ) : null}
      <GoogleButton next={next} />
      <OrDivider />
      <LoginForm next={next} />
    </AuthShell>
  );
}
