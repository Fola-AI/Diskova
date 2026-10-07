"use client";

import type { User } from "@supabase/supabase-js";
import { UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/db/client";

/**
 * Client-side auth state for the header, so public pages stay static/ISR (no cookies read on the server).
 */
export function AuthNav() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (user === undefined) return <span className="h-9 w-20" aria-hidden />;
  if (!user) {
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
