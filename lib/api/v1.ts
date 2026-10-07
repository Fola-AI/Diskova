import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { getBearerSession } from "@/lib/db/bearer";
import { clientIpFrom } from "@/lib/http/request-meta";
import { rateLimit } from "@/lib/ratelimit";
import { PostError } from "@/lib/services/posts";
import { ReportError } from "@/lib/services/reports";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/api/v1");

/**
 * Public JSON API helpers (§9): every response is `{ data, error, meta }`. Reads are anonymous,
 * CDN-cacheable and CORS-open; writes need a Supabase access token and go through the same
 * services (and RLS, rate limits and moderation) as the web app.
 */
export type ApiError = { code: string; message: string };
export class ApiProblem extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const READ_HEADERS = { "Access-Control-Allow-Origin": "*", Vary: "Accept-Encoding" };

export function ok<T>(data: T, meta: Record<string, unknown> = {}, cacheSeconds = 60): NextResponse {
  return NextResponse.json(
    { data, error: null, meta: { ...meta, generated_at: new Date().toISOString() } },
    { headers: { ...READ_HEADERS, "Cache-Control": cacheSeconds ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}` : "no-store" } },
  );
}

export function created<T>(data: T, meta: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ data, error: null, meta }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export function fail(status: number, code: string, message: string, extraHeaders: Record<string, string> = {}): NextResponse {
  return NextResponse.json({ data: null, error: { code, message } satisfies ApiError, meta: {} }, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
}

/** Map service errors (ZodError, PostError, ReportError…) to API errors without leaking internals. */
function toResponse(err: unknown): NextResponse {
  if (err instanceof ApiProblem) return fail(err.status, err.code, err.message);
  if (err instanceof ZodError) return fail(400, "invalid_request", err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  // Service errors carry user-facing messages (class names are minified, so check instances).
  if (err instanceof PostError || err instanceof ReportError) {
    const limited = /try again in/i.test(err.message);
    return fail(limited ? 429 : 422, limited ? "rate_limited" : "rejected", err.message);
  }
  Sentry.captureException(err, { tags: { area: "api-v1" } });
  return fail(500, "internal", "Something went wrong.");
}

/** Anonymous GET: per-IP limit (generous — carrier-grade NAT), then the handler. */
export function publicRead<C>(handler: (req: Request, ctx: C) => Promise<NextResponse>) {
  return async (req: Request, ctx: C): Promise<NextResponse> => {
    const rl = await rateLimit("apiIp", clientIpFrom(req.headers));
    if (!rl.ok) return fail(429, "rate_limited", "Too many requests.", { "Retry-After": String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))) });
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toResponse(err);
    }
  };
}

/** Authenticated write: Bearer Supabase JWT, verified email, account not suspended/banned. */
export function authedWrite<C>(handler: (req: Request, session: SessionContext, ctx: C) => Promise<NextResponse>) {
  return async (req: Request, ctx: C): Promise<NextResponse> => {
    try {
      const session = await getBearerSession(req);
      if (!session) return fail(401, "unauthorized", "Send a valid Supabase access token: Authorization: Bearer <token>.");
      if (!session.profile.email_verified_at) return fail(403, "email_unverified", "Verify your email address before posting.");
      if (session.profile.status === "suspended" || session.profile.status === "banned") return fail(403, "account_restricted", "Your account can't post right now.");
      return await handler(req, session, ctx);
    } catch (err) {
      return toResponse(err);
    }
  };
}

export async function jsonBody(req: Request): Promise<unknown> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) throw new ApiProblem(415, "unsupported_media_type", "Send a JSON body (Content-Type: application/json).");
  const text = await req.text();
  if (text.length > 20_000) throw new ApiProblem(413, "too_large", "Request body too large.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiProblem(400, "invalid_json", "Body is not valid JSON.");
  }
}

export const clampLimit = (v: string | null, def: number, max: number) => Math.min(max, Math.max(1, Number(v) || def));
