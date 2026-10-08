import { agentRoute } from "@/lib/agent/handler";
import { agentContent } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", (req) => agentContent(new URL(req.url).searchParams));
