import { agentRoute } from "@/lib/agent/handler";
import { agentModerationQueue } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", (req) => agentModerationQueue(new URL(req.url).searchParams));
