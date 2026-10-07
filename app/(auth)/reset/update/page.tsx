import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetUpdatePage() {
  return (
    <AuthShell title="Choose a new password" description="You'll stay signed in on this device.">
      <NewPasswordForm />
    </AuthShell>
  );
}
