import { z } from "zod";

/** Destructive admin actions always carry a reason (§12 acceptance). */
export const reasonSchema = z.string().trim().min(5, "Give a reason (at least 5 characters).").max(1000);

export const PAGE_SIZE = 50;

export function pageOffset(page: number | undefined): number {
  return (Math.max(1, page ?? 1) - 1) * PAGE_SIZE;
}
