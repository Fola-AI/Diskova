"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useSignedIn } from "@/lib/client/use-signed-in";

/**
 * Header sign-in state without loading supabase-js on public pages (~110 KB): we only check whether a
 * Supabase auth cookie exists. /me is still guarded server-side, so a stale cookie just leads to
 * the login page.
 */
export function AuthNav() {
  const signedIn = useSignedIn();

  if (signedIn === null) return <span className="inline-block h-10 w-20" aria-hidden />;
  if (!signedIn) {
    return (
      <Button asChild size="sm" variant="secondary">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }
  return (
    <Button asChild size="sm" variant="ghost" aria-label="My profile">
      <Link href="/me">
        <UserRound aria-hidden /> Me
      </Link>
    </Button>
  );
}
