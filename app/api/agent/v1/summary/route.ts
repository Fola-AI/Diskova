import { agentRoute } from "@/lib/agent/handler";
import { agentSummary } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", () => agentSummary());
