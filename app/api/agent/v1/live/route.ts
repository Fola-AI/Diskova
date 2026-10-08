import { agentRoute } from "@/lib/agent/handler";
import { agentLive } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", (req) => agentLive(new URL(req.url).searchParams));
