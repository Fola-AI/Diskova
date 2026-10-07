import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";

import { serverEnv } from "@/lib/env.server";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/ratelimit");

/**
 * Sliding-window rate limits (PRD §7.5). Per-user keys are primary; IP limits are generous
 * because of carrier-grade NAT. Emails are hashed before use as keys.
 */
const LIMITS = {
  signupIp: { tokens: 100, window: "1 h" },
  loginEmail: { tokens: 20, window: "15 m" },
  loginIp: { tokens: 300, window: "15 m" },
  emailLinkEmail: { tokens: 5, window: "1 h" }, // magic link / reset / resend (decision: 5/h per address)
  emailLinkIp: { tokens: 100, window: "1 h" },
  postUser: { tokens: 6, window: "1 h" }, // default; services pass platform_settings.max_posts_per_user_per_hour
  postIp: { tokens: 600, window: "1 h" },
  pulseUser: { tokens: 20, window: "1 h" },
  pulseUserVendor: { tokens: 2, window: "30 m" },
  reportUser: { tokens: 10, window: "1 h" },
  issueReportUser: { tokens: 5, window: "1 h" },
  issueReportIp: { tokens: 50, window: "1 h" },
  mediaUser: { tokens: 12, window: "1 h" },
  liveIp: { tokens: 120, window: "1 m" },
  profileUpdateUser: { tokens: 30, window: "1 h" },
  likeUser: { tokens: 120, window: "1 h" }, // decision: likes are cheap but shouldn't be scriptable
  assistantUser: { tokens: 20, window: "1 h" },
  assistantIp: { tokens: 200, window: "1 h" },
} as const satisfies Record<string, { tokens: number; window: `${number} ${"s" | "m" | "h" | "d"}` }>;

export type LimitName = keyof typeof LIMITS;

export interface LimitResult {
  ok: boolean;
  remaining: number;
  /** Unix ms when the window resets. */
  reset: number;
}

let redis: Redis | null | undefined;
const limiters = new Map<string, Ratelimit>();

export function getRedis(): Redis | null {
  if (redis === undefined) {
    const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = serverEnv();
    redis = url && token ? new Redis({ url, token }) : null;
  }
  return redis;
}

function limiterFor(name: LimitName, tokensOverride?: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const cfg = LIMITS[name];
  const tokens = tokensOverride ?? cfg.tokens;
  const cacheKey = `${name}:${tokens}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(tokens, cfg.window),
      prefix: `rl:${name}`,
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

export function hashKey(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

/**
 * Consume one token. Fails OPEN if Redis is unreachable or unconfigured (availability first —
 * Supabase Auth keeps its own limits), and reports the failure to Sentry.
 */
export async function rateLimit(
  name: LimitName,
  key: string | null | undefined,
  opts: { tokens?: number } = {},
): Promise<LimitResult> {
  if (!key) return { ok: true, remaining: -1, reset: 0 };
  const limiter = limiterFor(name, opts.tokens);
  if (!limiter) return { ok: true, remaining: -1, reset: 0 };
  try {
    const res = await limiter.limit(key);
    return { ok: res.success, remaining: res.remaining, reset: res.reset };
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "ratelimit", limit: name } });
    return { ok: true, remaining: -1, reset: 0 };
  }
}

/** Check several limits; the first failure wins. All are consumed (sliding window semantics). */
export async function rateLimitAll(
  checks: Array<[LimitName, string | null | undefined, { tokens?: number }?]>,
): Promise<LimitResult> {
  const results = await Promise.all(checks.map(([n, k, o]) => rateLimit(n, k, o)));
  return results.find((r) => !r.ok) ?? results[0] ?? { ok: true, remaining: -1, reset: 0 };
}

export function retryAfterText(reset: number): string {
  const minutes = Math.max(1, Math.ceil((reset - Date.now()) / 60_000));
  return minutes === 1 ? "about a minute" : `${minutes} minutes`;
}
