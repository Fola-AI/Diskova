import { agentRoute } from "@/lib/agent/handler";
import { agentVendors } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", (req) => agentVendors(new URL(req.url).searchParams));
