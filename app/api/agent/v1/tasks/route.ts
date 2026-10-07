import { agentJson, agentRoute } from "@/lib/agent/handler";
import { agentTasks } from "@/lib/services/admin/agent-data";
import { createTaskAs } from "@/lib/services/admin/tasks";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", () => agentTasks());

/** Created on behalf of the key's owner; audited as actor_role = 'agent'. */
export const POST = agentRoute("tasks:write", async (req, agent) => {
  const id = await createTaskAs({ id: agent.createdBy, role: "agent" }, await agentJson(req), { ip: agent.ip, userAgent: req.headers.get("user-agent") }, { agent_key: agent.keyId });
  return { id };
});
