import { agentRoute } from "@/lib/agent/handler";
import { ApiProblem } from "@/lib/api/v1";
import { agentUser } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
/** Email and informational IP/network data only with pii:read (§12). */
export const GET = agentRoute("read", async (_req, agent, { params }: { params: Promise<{ id: string }> }) => {
  const u = await agentUser((await params).id, agent.has("pii:read"));
  if (!u) throw new ApiProblem(404, "not_found", "Unknown user.");
  return u;
});
