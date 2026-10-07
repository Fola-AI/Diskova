"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/db/client";

export function GoogleButton({ next = "/me" }: { next?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setPending(true);
    setError(null);
    const { error: oauthError } = await getBrowserSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthError) {
      setPending(false);
      setError("Google sign-in isn't available right now. Please use email instead.");
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" onClick={onClick} disabled={pending}>
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continue with Google
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
