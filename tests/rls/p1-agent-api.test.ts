/** Stage P1 · Agent API (§12, §6.24): keys, expiry, revocation, IP allowlist, scopes, PII gating, audit, OpenAPI. */
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as issues } from "@/app/api/agent/v1/issues/route";
import { POST as notes } from "@/app/api/agent/v1/notes/route";
import { GET as openapi } from "@/app/api/agent/v1/openapi.json/route";
import { GET as schema } from "@/app/api/agent/v1/schema/route";
import { GET as search } from "@/app/api/agent/v1/search/route";
import { GET as summary } from "@/app/api/agent/v1/summary/route";
import { GET as listTasks, POST as createTask } from "@/app/api/agent/v1/tasks/route";
import { GET as user } from "@/app/api/agent/v1/users/[id]/route";
import { GET as vendor } from "@/app/api/agent/v1/vendors/[id]/route";
import { GET as vendors } from "@/app/api/agent/v1/vendors/route";
import type { SessionContext } from "@/lib/auth/guards";
import { AGENT_ENDPOINTS } from "@/lib/agent/registry";
import { createAgentKey, hashAgentKey, revokeAgentKey } from "@/lib/services/admin/agent-keys";

import { cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv ? describe : describe.skip;
const meta = { ip: null, userAgent: "vitest" };
const BASE = "http://localhost/api/agent/v1";
type Env<T = Record<string, unknown>> = { data: T; error: { code: string; message: string } | null };
const req = (path: string, key?: string, opts: { ip?: string; body?: unknown } = {}) =>
  new Request(`${BASE}${path}`, {
    method: opts.body ? "POST" : "GET",
    headers: { ...(key ? { "x-agent-key": key } : {}), "x-forwarded-for": opts.ip ?? "198.51.100.7", ...(opts.body ? { "content-type": "application/json" } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
const p = <T extends Record<string, string>>(v: T) => ({ params: Promise.resolve(v) });
const none = undefined as never;
async function json<T = Record<string, unknown>>(r: Response): Promise<Env<T>> {
  return (await r.json()) as Env<T>;
}

d("P1 · Agent API", () => {
  let sup: SessionContext;
  let target: TestUser;
  const keys: Record<string, string> = {};
  const keyIds: string[] = [];
  let vendorId = "";
  const taskIds: string[] = [];

  beforeAll(async () => {
    const [s, a, t] = await Promise.all([createUser("p1-super"), createUser("p1-admin"), createUser("p1-target")]);
    target = t;
    const svc = serviceClient();
    await svc.from("profiles").update({ role: "super_admin" }).eq("id", s.id);
    await svc.from("profiles").update({ role: "admin" }).eq("id", a.id);
    sup = await sessionFor(s);
    const adm = await sessionFor(a);
    await expect(createAgentKey(adm, { name: "nope", scopes: ["read"] }, meta)).rejects.toThrow(/super admin/);

    for (const [label, scopes, ipAllowlist] of [
      ["read", ["read"], []], ["write", ["tasks:write", "notes:write"], []], ["pii", ["pii:read"], []], ["ip", ["read"], ["203.0.113.0/24"]], ["revoked", ["read"], []],
    ] as const) {
      const k = await createAgentKey(sup, { name: `p1 ${label}`, scopes: [...scopes], ipAllowlist: [...ipAllowlist] }, meta);
      keys[label] = k.key;
      keyIds.push(k.id);
    }
    await revokeAgentKey(sup, keyIds[4]!, meta);
    // An already-expired key (created directly through the RPC with a past expiry).
    const expired = `dk_${randomBytes(4).toString("hex")}_${randomBytes(24).toString("base64url")}`;
    const { data: expiredId } = await svc.rpc("admin_create_agent_key", { p_name: "p1 expired", p_key_hash: hashAgentKey(expired), p_key_prefix: expired.slice(0, 11), p_scopes: ["read"], p_ip_allowlist: [], p_expires_at: new Date(Date.now() - 60_000).toISOString(), p_created_by: s.id });
    keys.expired = expired;
    keyIds.push(expiredId!);
    vendorId = (await createPublishedVendor("p1")).id;
  });

  afterAll(async () => {
    const svc = serviceClient();
    for (const id of keyIds) await svc.rpc("admin_revoke_agent_key", { p_id: id });
    if (taskIds.length) await svc.from("admin_tasks").delete().in("id", taskIds);
    await cleanup();
  });

  it("the plaintext key is never stored — only its sha256 and prefix", async () => {
    const { data } = await serviceClient().rpc("admin_list_agent_keys");
    const row = data!.find((k) => k.id === keyIds[0]);
    expect(row!.key_prefix).toBe(keys.read!.slice(0, 11));
    expect(JSON.stringify(data)).not.toContain(keys.read!);
    expect(row!.scopes).toEqual(["read"]);
  });

  it("a valid key → summary (200, envelope)", async () => {
    const res = await summary(req("/summary", keys.read), none);
    expect(res.status).toBe(200);
    const b = await json<{ kpis: { users_total: number } }>(res);
    expect(b.error).toBeNull();
    expect(typeof b.data.kpis.users_total).toBe("number");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("missing / unknown / revoked / expired keys → 401; wrong IP → 403; allowed IP → 200", async () => {
    expect((await json(await summary(req("/summary"), none))).error?.code).toBe("missing_key");
    expect((await summary(req("/summary", "dk_00000000_" + "x".repeat(32)), none)).status).toBe(401);
    const revoked = await summary(req("/summary", keys.revoked), none);
    expect([revoked.status, (await json(revoked)).error?.code]).toEqual([401, "key_revoked"]);
    const expired = await summary(req("/summary", keys.expired), none);
    expect([expired.status, (await json(expired)).error?.code]).toEqual([401, "key_expired"]);
    const wrongIp = await summary(req("/summary", keys.ip, { ip: "198.51.100.7" }), none);
    expect([wrongIp.status, (await json(wrongIp)).error?.code]).toEqual([403, "ip_not_allowed"]);
    expect((await summary(req("/summary", keys.ip, { ip: "203.0.113.42" }), none)).status).toBe(200);
  });

  it("scopes are enforced: read can't write; tasks:write creates a task for the key's owner", async () => {
    const denied = await createTask(req("/tasks", keys.read, { body: { title: "Agent task" } }), none);
    expect([denied.status, (await json(denied)).error?.code]).toEqual([403, "insufficient_scope"]);
    const ok = await createTask(req("/tasks", keys.write, { body: { title: "Follow up on Lekki reports", priority: "high" } }), none);
    expect(ok.status).toBe(201);
    const { data } = await json<{ id: string }>(ok);
    taskIds.push(data.id);
    const { data: task } = await serviceClient().from("admin_tasks").select("title, priority, created_by").eq("id", data.id).single();
    expect(task).toEqual({ title: "Follow up on Lekki reports", priority: "high", created_by: sup.user.id });
    expect((await listTasks(req("/tasks", keys.read), none)).status).toBe(200);
    const bad = await createTask(req("/tasks", keys.write, { body: { title: "x" } }), none);
    expect(bad.status).toBe(400);
  });

  it("notes:write adds an append-only note; read can't", async () => {
    const body = { entity_type: "vendor", entity_id: vendorId, note: "Owner asked for help with prices" };
    expect((await notes(req("/notes", keys.read, { body }), none)).status).toBe(403);
    expect((await notes(req("/notes", keys.write, { body }), none)).status).toBe(201);
    const { data } = await serviceClient().rpc("admin_list_audit", { p_entity_id: vendorId, p_action_prefix: "note.", p_limit: 5 });
    expect(data?.[0]).toMatchObject({ actor_role: "agent", reason: "Owner asked for help with prices" });
  });

  it("PII: issues need pii:read; user email/IP only with pii:read", async () => {
    expect((await issues(req("/issues", keys.read), none)).status).toBe(403);
    expect((await issues(req("/issues", keys.pii), none)).status).toBe(200);
    const plain = await json<Record<string, unknown>>(await user(req(`/users/${target.id}`, keys.read), p({ id: target.id })));
    expect(plain.data).not.toHaveProperty("email");
    expect(JSON.stringify(plain.data)).not.toContain(target.email);
    const withPii = await json<{ email: string }>(await user(req(`/users/${target.id}`, keys.pii), p({ id: target.id })));
    expect(withPii.data.email).toBe(target.email);
    const s = await json<{ users: Array<Record<string, unknown>> }>(await search(req(`/search?q=p1-target`, keys.read), none));
    expect(JSON.stringify(s.data)).not.toContain("@example.com");
  });

  it("vendor endpoints work and never expose verification documents", async () => {
    const list = await json<{ total: number }>(await vendors(req("/vendors?no_prices=true&limit=5", keys.read), none));
    expect(list.data.total).toBeGreaterThan(0);
    const one = await vendor(req(`/vendors/${vendorId}`, keys.read), p({ id: vendorId }));
    expect(one.status).toBe(200);
    expect(JSON.stringify(await one.json())).not.toMatch(/business_doc_url|id_doc_url|verification-docs/);
    expect((await vendor(req("/vendors/not-a-uuid", keys.read), p({ id: "not-a-uuid" }))).status).toBe(400);
  });

  it("every authenticated call is audited with actor_role = 'agent' (denials too)", async () => {
    const { data } = await serviceClient().rpc("admin_list_audit", { p_action_prefix: "agent.", p_entity_id: keyIds[0]!, p_limit: 50 });
    expect(data!.length).toBeGreaterThan(3);
    expect(data!.every((a) => a.actor_role === "agent")).toBe(true);
    const { data: denied } = await serviceClient().rpc("admin_list_audit", { p_action_prefix: "agent.", p_entity_id: keyIds[3]!, p_limit: 10 });
    expect(denied!.some((a) => (a.after as { denied?: string } | null)?.denied === "ip")).toBe(true);
  });

  it("/schema lists every endpoint with what this key may call", async () => {
    const b = await json<{ endpoints: Array<{ path: string; allowed: boolean }> }>(await schema(req("/schema", keys.read), none));
    expect(b.data.endpoints.length).toBe(AGENT_ENDPOINTS.length);
    expect(b.data.endpoints.find((e) => e.path === "/issues")!.allowed).toBe(false);
  });

  it("openapi.json is a valid OpenAPI 3.1 document matching the real routes", async () => {
    const res = await openapi(req("/openapi.json", keys.read), none);
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, Record<string, { operationId: string; parameters: Array<{ name: string; in: string; required: boolean }>; responses: Record<string, unknown> }>>; components: Record<string, Record<string, unknown>> };
    expect(doc.openapi).toBe("3.1.0");
    const ops = Object.entries(doc.paths).flatMap(([path, methods]) => Object.entries(methods).map(([m, op]) => ({ path, m, op })));
    expect(ops.length).toBe(AGENT_ENDPOINTS.length);
    expect(new Set(ops.map((o) => o.op.operationId)).size).toBe(ops.length);
    for (const { path, op } of ops) {
      // path templates declare their parameters
      for (const name of [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1])) expect(op.parameters.some((p) => p.name === name && p.in === "path" && p.required), `${path} ${name}`).toBe(true);
      expect(Object.keys(op.responses).length).toBeGreaterThan(0);
      // a route file exists for every documented path
      expect(existsSync(`app/api/agent/v1${path.replace(/\{(\w+)\}/g, "[$1]")}/route.ts`), path).toBe(true);
    }
    // every $ref resolves
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"#\/([^"]+)"/g)].map((m) => m[1]!);
    for (const ref of refs) {
      const target = ref.split("/").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], doc);
      expect(target, ref).toBeTruthy();
    }
    expect(doc.components.securitySchemes).toMatchObject({ AgentKey: { type: "apiKey", in: "header", name: "X-Agent-Key" } });
  });
});
