import type { AgentScope } from "@/lib/services/admin/agent-keys";

/** Single source of truth for the Agent API surface → /schema and /openapi.json (§12). */
export interface Param { name: string; in: "query" | "path"; type: "string" | "integer" | "boolean"; description: string; enum?: readonly string[]; required?: boolean }
export interface Endpoint { method: "GET" | "POST"; path: string; scope: AgentScope; summary: string; params?: Param[]; body?: { required: string[]; properties: Record<string, { type: string; description: string; enum?: readonly string[] }> } }

const limit = (max: number, def: number): Param => ({ name: "limit", in: "query", type: "integer", description: `1–${max} (default ${def})` });
const id = (what: string): Param => ({ name: "id", in: "path", type: "string", description: `${what} id (uuid)`, required: true });

export const AGENT_ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/summary", scope: "read", summary: "Platform KPIs (24 h), moderation load, 14-day daily series, pending reviews and open tasks." },
  { method: "GET", path: "/activity", scope: "read", summary: "Recent activity events (last 30 days), newest first.", params: [
    { name: "kind", in: "query", type: "string", description: "Kind prefix, e.g. post, vendor, user, event, report, sanction" },
    { name: "city", in: "query", type: "string", description: "City slug" },
    { name: "vendor_id", in: "query", type: "string", description: "Vendor uuid" },
    { name: "user_id", in: "query", type: "string", description: "Profile uuid" }, limit(200, 50)] },
  { method: "GET", path: "/live", scope: "read", summary: "Venues with live crowd signals (the Tonight view).", params: [{ name: "city", in: "query", type: "string", description: "City slug (default: all cities)" }] },
  { method: "GET", path: "/vendors", scope: "read", summary: "Vendor table with health columns and filters (as in the admin back office).", params: [
    { name: "q", in: "query", type: "string", description: "Name / slug search" },
    { name: "status", in: "query", type: "string", description: "Listing status", enum: ["draft", "pending_review", "published", "suspended", "rejected"] },
    { name: "city", in: "query", type: "string", description: "City slug" },
    { name: "verified", in: "query", type: "boolean", description: "Verified only (true) / unverified only (false)" },
    { name: "claim", in: "query", type: "string", description: "Claim status", enum: ["unclaimed", "claimed"] },
    { name: "no_prices", in: "query", type: "boolean", description: "Only vendors without prices" },
    { name: "no_photos", in: "query", type: "boolean", description: "Only vendors without photos" },
    { name: "never_posted", in: "query", type: "boolean", description: "Only vendors that never posted" },
    { name: "sort", in: "query", type: "string", description: "Sort column", enum: ["name", "city", "status", "completeness", "posts_7d", "official_updates_7d", "open_reports", "last_activity_at", "created_at"] },
    { name: "dir", in: "query", type: "string", description: "Sort direction", enum: ["asc", "desc"] }, limit(200, 50),
    { name: "offset", in: "query", type: "integer", description: "Pagination offset" }] },
  { method: "GET", path: "/vendors/{id}", scope: "read", summary: "One vendor: listing, members, prices, recent posts (all statuses), events, pending verification (no documents), reports, audit trail, notes.", params: [id("Vendor")] },
  { method: "GET", path: "/moderation/queue", scope: "read", summary: "Open moderation items by priority then age, with post, author card and signals. Read-only: no moderation writes are exposed.", params: [
    { name: "source", in: "query", type: "string", description: "Queue source", enum: ["hold", "auto_block", "auto_flag", "user_report", "vendor_dispute", "random_sample"] }, limit(100, 50)] },
  { method: "GET", path: "/moderation/stats", scope: "read", summary: "Open items by source/priority, 7-day human decisions, auto-flags, median time to close." },
  { method: "GET", path: "/reports", scope: "read", summary: "User reports (default: open).", params: [
    { name: "status", in: "query", type: "string", description: "Report status (or all)", enum: ["all", "open", "reviewing", "resolved_removed", "resolved_kept", "dismissed"] },
    { name: "entity", in: "query", type: "string", description: "Reported entity type", enum: ["post", "vendor", "event", "profile"] },
    { name: "offset", in: "query", type: "integer", description: "Pagination offset" }] },
  { method: "GET", path: "/issues", scope: "pii:read", summary: "Private safety/issue reports. Descriptions may contain third-party personal data — requires pii:read.", params: [
    { name: "status", in: "query", type: "string", description: "Issue status", enum: ["new", "triaged", "escalated", "closed"] }, limit(500, 100)] },
  { method: "GET", path: "/users/{id}", scope: "read", summary: "User profile, sanctions, recent posts and audit timeline. Email and IP/network info only with pii:read.", params: [id("Profile")] },
  { method: "GET", path: "/events", scope: "read", summary: "Events in any status (default: pending review + upcoming published).", params: [
    { name: "status", in: "query", type: "string", description: "Event status", enum: ["draft", "pending_review", "published", "cancelled", "rejected"] },
    { name: "city", in: "query", type: "string", description: "City slug" }, limit(200, 100)] },
  { method: "GET", path: "/content", scope: "read", summary: "Guides, toolkit, blog and safety pages in every status (metadata only).", params: [
    { name: "status", in: "query", type: "string", description: "Guide status", enum: ["draft", "review", "published", "archived"] },
    { name: "type", in: "query", type: "string", description: "Guide type", enum: ["city_guide", "area_guide", "daytime", "toolkit", "blog", "safety_page"] }] },
  { method: "GET", path: "/tasks", scope: "read", summary: "Admin tasks (kanban)." },
  { method: "POST", path: "/tasks", scope: "tasks:write", summary: "Create an admin task (audited; created on behalf of the key's owner).", body: { required: ["title"], properties: {
    title: { type: "string", description: "3–200 chars" }, description: { type: "string", description: "≤ 4000 chars" },
    priority: { type: "string", description: "Priority", enum: ["low", "normal", "high", "urgent"] }, due_at: { type: "string", description: "YYYY-MM-DD" },
    related_entity_type: { type: "string", description: "e.g. vendor, profile" }, related_entity_id: { type: "string", description: "uuid" } } } },
  { method: "POST", path: "/notes", scope: "notes:write", summary: "Add an internal note to a vendor, profile, event or post (append-only, audited).", body: { required: ["entity_type", "entity_id", "note"], properties: {
    entity_type: { type: "string", description: "Entity", enum: ["vendor", "profile", "event", "post"] }, entity_id: { type: "string", description: "uuid" }, note: { type: "string", description: "2–2000 chars" } } } },
  { method: "GET", path: "/search", scope: "read", summary: "Search vendors, users (no email without pii:read), events and content.", params: [{ name: "q", in: "query", type: "string", description: "≥ 2 characters", required: true }] },
  { method: "GET", path: "/schema", scope: "read", summary: "This API's endpoints, scopes and enums as JSON." },
  { method: "GET", path: "/openapi.json", scope: "read", summary: "OpenAPI 3.1 description of this API." },
];

export function openApiDocument(serverUrl: string): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const e of AGENT_ENDPOINTS) {
    const op: Record<string, unknown> = {
      operationId: `${e.method.toLowerCase()}${e.path.replace(/[{}]/g, "").replace(/[^a-zA-Z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : ""))}`,
      summary: e.summary,
      description: `Required scope: \`${e.scope}\``,
      "x-required-scope": e.scope,
      parameters: (e.params ?? []).map((p) => ({ name: p.name, in: p.in, required: p.in === "path" ? true : Boolean(p.required), description: p.description, schema: { type: p.type, ...(p.enum ? { enum: p.enum } : {}) } })),
      responses: {
        [e.method === "POST" ? "201" : "200"]: { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Envelope" } } } },
        "400": { $ref: "#/components/responses/Error" },
        "401": { $ref: "#/components/responses/Error" },
        "403": { $ref: "#/components/responses/Error" },
        "429": { $ref: "#/components/responses/Error" },
      },
    };
    if (e.body) {
      op.requestBody = { required: true, content: { "application/json": { schema: { type: "object", required: e.body.required, properties: Object.fromEntries(Object.entries(e.body.properties).map(([k, v]) => [k, { type: v.type, description: v.description, ...(v.enum ? { enum: v.enum } : {}) }])) } } } };
    }
    paths[e.path] = { ...(paths[e.path] ?? {}), [e.method.toLowerCase()]: op };
  }
  return {
    openapi: "3.1.0",
    info: { title: "Agent API", version: "1.0.0", description: "Read-mostly operations API for an AI agent. Keys are created by a super admin in Admin → Settings." },
    servers: [{ url: serverUrl }],
    security: [{ AgentKey: [] }],
    paths,
    components: {
      securitySchemes: { AgentKey: { type: "apiKey", in: "header", name: "X-Agent-Key" } },
      schemas: {
        Error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" } } },
        Envelope: { type: "object", required: ["data", "error", "meta"], properties: { data: {}, error: { oneOf: [{ type: "null" }, { $ref: "#/components/schemas/Error" }] }, meta: { type: "object" } } },
      },
      responses: { Error: { description: "Error envelope", content: { "application/json": { schema: { $ref: "#/components/schemas/Envelope" } } } } },
    },
  };
}
