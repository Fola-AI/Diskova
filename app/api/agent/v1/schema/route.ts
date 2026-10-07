import { agentRoute } from "@/lib/agent/handler";
import { AGENT_ENDPOINTS } from "@/lib/agent/registry";
import { AGENT_SCOPES } from "@/lib/services/admin/agent-keys";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", async (_req, agent) => ({
  base_path: "/api/agent/v1",
  auth: { header: "X-Agent-Key", rate_limit: "120 requests/minute/key" },
  your_scopes: agent.scopes,
  scopes: AGENT_SCOPES,
  endpoints: AGENT_ENDPOINTS.map((e) => ({ ...e, allowed: agent.has(e.scope) })),
  notes: ["No moderation or sanction writes are exposed.", "Every call is audited with actor_role = 'agent'.", "Email and IP data require pii:read."],
}));
