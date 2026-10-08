"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { hasAuthCookie } from "@/lib/client/auth-cookie";

/**
 * `null` until hydrated, then whether a Supabase auth cookie exists. Re-checked on every route change
 * (the layout persists across sign-in / sign-out navigations) and when the window regains focus.
 */
export function useSignedIn(): boolean | null {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    setSignedIn(hasAuthCookie());
  }, [pathname]);
  useEffect(() => {
    const onFocus = () => setSignedIn(hasAuthCookie());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return signedIn;
}
