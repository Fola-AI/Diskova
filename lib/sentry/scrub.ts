/**
 * Sentry `beforeSend` scrubbing (PRD §7.8). Removes tokens, emails and IP addresses from every
 * string in an event, and drops sensitive headers/cookies/user fields outright.
 */

const REDACTED = "[redacted]";

const PATTERNS: RegExp[] = [
  // JWTs (Supabase access/refresh tokens)
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  // Supabase new-format keys
  /sb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}/g,
  // Common API key prefixes (OpenAI, Groq, Resend, Mapbox secret/public, Upstash)
  /\b(?:sk|gsk|re|pk|sk-proj)[-_.][A-Za-z0-9_.-]{16,}/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  // key=value style secrets in URLs / messages
  /((?:access_token|refresh_token|token|apikey|api_key|key|secret|password|code)=)[^&\s"']+/gi,
  // Emails
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  // IPv4
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // IPv6 (full or compressed, at least 3 groups)
  /\b(?:[A-Fa-f0-9]{1,4}:){2,7}(?::|[A-Fa-f0-9]{1,4})\b/g,
];

const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "cookies",
  "set-cookie",
  "x-agent-key",
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "ip_address",
  "email",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "apikey",
  "api_key",
]);

export function scrubString(input: string): string {
  let out = input;
  for (const pattern of PATTERNS) {
    out = out.replace(pattern, (match, prefix?: unknown) =>
      typeof prefix === "string" && match.startsWith(prefix) ? `${prefix}${REDACTED}` : REDACTED,
    );
  }
  return out;
}

function scrubValue(value: unknown, depth: number): unknown {
  if (depth > 12) return value;
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? REDACTED : scrubValue(v, depth + 1);
    }
    return result;
  }
  return value;
}

/** Deep-scrub a Sentry event (or breadcrumb). Generic so it works with any Sentry event type. */
export function scrubEvent<T>(event: T): T {
  return scrubValue(event, 0) as T;
}
