import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { ApiProblem } from "@/lib/api/v1";
import { clientIpFrom } from "@/lib/http/request-meta";
import { rateLimit } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";
import { hashAgentKey, type AgentScope } from "@/lib/services/admin/agent-keys";
import { AdminActionError } from "@/lib/services/admin/vendors";

assertServerOnly("lib/agent/handler");

export interface AgentContext {
  keyId: string;
  name: string;
  scopes: AgentScope[];
  createdBy: string | null;
  ip: string | null;
  has(scope: AgentScope): boolean;
}

const KEY_FORMAT = /^dk_[0-9a-f]{8}_[A-Za-z0-9_-]{32}$/;

function envelope(status: number, data: unknown, error: { code: string; message: string } | null, meta: Record<string, unknown> = {}, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json({ data, error, meta }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
const fail = (status: number, code: string, message: string, headers?: Record<string, string>) => envelope(status, null, { code, message }, {}, headers);

async function audit(agent: Pick<AgentContext, "keyId" | "name" | "createdBy" | "ip">, req: Request, status: number, extra: Record<string, unknown> = {}) {
  const url = new URL(req.url);
  await writeAudit({
    action: `agent.${req.method.toLowerCase()}`,
    entityType: "agent_api",
    entityId: agent.keyId,
    after: { key: agent.name, key_owner: agent.createdBy, path: url.pathname.replace(/^\/api\/agent\/v1/, ""), query: Object.fromEntries(url.searchParams), status, ...extra } as never,
    actorId: null,
    actorRole: "agent",
    ip: agent.ip,
    userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
  }).catch((err: unknown) => Sentry.captureException(err, { tags: { area: "agent-audit" } }));
}

/**
 * §12 Agent API pipeline: X-Agent-Key → (401 unknown / revoked / expired, 403 IP not allowed) →
 * 120 req/min/key → scope check (403) → handler → envelope. Every authenticated call is audited
 * with actor_role = 'agent'. Responses are never cached.
 */
export function agentRoute<C>(scope: AgentScope, handler: (req: Request, agent: AgentContext, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C): Promise<NextResponse> => {
    const presented = req.headers.get("x-agent-key")?.trim() ?? "";
    if (!presented) return fail(401, "missing_key", "Send your key in the X-Agent-Key header.");
    if (!KEY_FORMAT.test(presented)) return fail(401, "invalid_key", "Unknown or malformed key.");
    const ip = clientIpFrom(req.headers);
    const { data, error } = await getAdminSupabase().rpc("admin_verify_agent_key", { p_key_hash: hashAgentKey(presented), p_ip: ip ?? undefined });
    if (error) {
      Sentry.captureException(error, { tags: { area: "agent-auth" } });
      return fail(500, "internal", "Something went wrong.");
    }
    const k = data?.[0];
    if (!k) return fail(401, "invalid_key", "Unknown or malformed key.");
    const base = { keyId: k.id, name: k.name, createdBy: k.created_by, ip };
    if (k.revoked) {
      await audit(base, req, 401, { denied: "revoked" });
      return fail(401, "key_revoked", "This key has been revoked.");
    }
    if (k.expired) {
      await audit(base, req, 401, { denied: "expired" });
      return fail(401, "key_expired", "This key has expired. Ask a super admin for a new one.");
    }
    if (!k.ip_allowed) {
      await audit(base, req, 403, { denied: "ip" });
      return fail(403, "ip_not_allowed", "Requests from this IP address aren't allowed for this key.");
    }
    const rl = await rateLimit("agentKey", k.id);
    if (!rl.ok) return fail(429, "rate_limited", "120 requests per minute per key.", { "Retry-After": String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))) });

    const scopes = k.scopes as AgentScope[];
    const agent: AgentContext = { ...base, scopes, has: (s) => scopes.includes(s) };
    if (!agent.has(scope)) {
      await audit(base, req, 403, { denied: `scope:${scope}` });
      return fail(403, "insufficient_scope", `This endpoint needs the "${scope}" scope.`);
    }
    try {
      const result = await handler(req, agent, ctx);
      const status = req.method === "POST" ? 201 : 200;
      await audit(base, req, status);
      return envelope(status, result, null, { generated_at: new Date().toISOString() });
    } catch (err) {
      let res: NextResponse;
      if (err instanceof ApiProblem) res = fail(err.status, err.code, err.message);
      else if (err instanceof ZodError) res = fail(400, "invalid_request", err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
      else if (err instanceof AdminActionError) res = fail(422, "rejected", err.message);
      else {
        Sentry.captureException(err, { tags: { area: "agent-api" } });
        res = fail(500, "internal", "Something went wrong.");
      }
      await audit(base, req, res.status);
      return res;
    }
  };
}

export async function agentJson(req: Request): Promise<unknown> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) throw new ApiProblem(415, "unsupported_media_type", "Send JSON (Content-Type: application/json).");
  const text = await req.text();
  if (text.length > 20_000) throw new ApiProblem(413, "too_large", "Body too large.");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiProblem(400, "invalid_json", "Body is not valid JSON.");
  }
}
