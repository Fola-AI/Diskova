import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordReset } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailLinkForm } from "@/components/auth/email-link-form";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ResetPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we'll send you a link to choose a new password."
      footer={
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <EmailLinkForm action={requestPasswordReset} submitLabel="Send reset link" />
    </AuthShell>
  );
}
