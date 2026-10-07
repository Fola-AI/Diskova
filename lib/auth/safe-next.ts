/**
 * Validate a post-auth redirect target. Only same-site absolute paths are allowed
 * (no protocol-relative "//", no backslashes, no schemes) to prevent open redirects.
 */
export function safeNext(next: string | null | undefined, fallback = "/me"): string {
  if (!next || typeof next !== "string") return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/^\/[^/]*:/.test(value)) return fallback;
  if (value.length > 512) return fallback;
  return value;
}
