"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Header sign-in state without loading supabase-js on public pages (~110 KB): we only check whether a
 * Supabase auth cookie exists. /me is still guarded server-side, so a stale cookie just leads to
 * the login page.
 */
function hasAuthCookie(): boolean {
  return document.cookie.split("; ").some((c) => c.startsWith("sb-") && c.includes("-auth-token"));
}

export function AuthNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setSignedIn(hasAuthCookie());
    const onFocus = () => setSignedIn(hasAuthCookie());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (signedIn === null) return <span className="h-9 w-20" aria-hidden />;
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
