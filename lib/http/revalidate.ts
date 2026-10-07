import { revalidatePath } from "next/cache";

/** revalidatePath that is a no-op outside a Next.js request (scripts, integration tests). */
export function safeRevalidatePath(path: string): void {
  try {
    revalidatePath(path);
  } catch {
    // not inside a Next.js request — nothing to revalidate
  }
}
