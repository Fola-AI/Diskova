import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/or-divider";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignupPage() {
  return (
    <AuthShell
      title="Join the vibe"
      description="Free account. Post check-ins, pulse venues and climb the December leaderboard."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton next="/me?welcome=1" />
      <p className="mt-2 text-center text-xs text-muted-foreground">
        By continuing with Google you agree to the{" "}
        <Link href="/terms" className="underline underline-offset-4">Terms</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
      </p>
      <OrDivider label="or with email" />
      <SignupForm />
    </AuthShell>
  );
}
