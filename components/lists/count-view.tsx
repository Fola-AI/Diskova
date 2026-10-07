"use client";

import { useEffect } from "react";

import { countListViewAction } from "@/app/actions/lists";

/** Counts one view per visitor IP per hour (server-side rate limit), after the page is shown. */
export function CountListView({ token }: { token: string }) {
  useEffect(() => {
    const t = setTimeout(() => void countListViewAction(token), 1500);
    return () => clearTimeout(t);
  }, [token]);
  return null;
}
