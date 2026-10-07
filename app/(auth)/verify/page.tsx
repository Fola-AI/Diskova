import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import Link from "next/link";

import { resendVerification } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { TrackOnMount } from "@/components/analytics/track";
import { EmailLinkForm } from "@/components/auth/email-link-form";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default function VerifyPage() {
  return (
    <>
      <TrackOnMount event="signup_completed" />
      <AuthShell
        title="Check your email"
        description="We've sent you a link to confirm your address. You need to confirm before you can post."
        footer={
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-secondary p-4 text-sm">
          <MailCheck className="h-6 w-6 shrink-0 text-positive" aria-hidden />
          <p>
            Open the email on this device and tap the link. It can take a minute — check spam too.
          </p>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Didn&apos;t get it? We can send another.
        </p>
        <EmailLinkForm action={resendVerification} submitLabel="Resend confirmation link" />
      </AuthShell>
    </>
  );
}
