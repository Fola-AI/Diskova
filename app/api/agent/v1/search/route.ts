import { agentRoute } from "@/lib/agent/handler";
import { agentSearch } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", (req, agent) => agentSearch(new URL(req.url).searchParams, agent.has("pii:read")));
