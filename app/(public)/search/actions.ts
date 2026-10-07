"use server";

import { z } from "zod";

import { searchDirectory, type SearchHit } from "@/lib/db/directory";

const qSchema = z.string().trim().min(2).max(100);

/** Typeahead (§8.8). Public, read-only, RLS-scoped to published content. */
export async function typeahead(q: string): Promise<SearchHit[]> {
  const parsed = qSchema.safeParse(q);
  if (!parsed.success) return [];
  try {
    return await searchDirectory(parsed.data, undefined, 8);
  } catch {
    return [];
  }
}
