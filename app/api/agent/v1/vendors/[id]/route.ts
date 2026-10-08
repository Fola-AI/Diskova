import { agentRoute } from "@/lib/agent/handler";
import { ApiProblem } from "@/lib/api/v1";
import { agentVendor } from "@/lib/services/admin/agent-data";

export const dynamic = "force-dynamic";
export const GET = agentRoute("read", async (_req, _agent, { params }: { params: Promise<{ id: string }> }) => {
  const v = await agentVendor((await params).id);
  if (!v) throw new ApiProblem(404, "not_found", "Unknown vendor.");
  return v;
});
