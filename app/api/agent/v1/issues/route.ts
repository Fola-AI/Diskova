import { agentRoute } from "@/lib/agent/handler";
import { agentIssues } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
/** §12: issue descriptions may contain third-party PII → pii:read. */
export const GET = agentRoute("pii:read", (req) => agentIssues(new URL(req.url).searchParams));
