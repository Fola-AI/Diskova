import { agentRoute } from "@/lib/agent/handler";
import { agentReports } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", (req) => agentReports(new URL(req.url).searchParams));
