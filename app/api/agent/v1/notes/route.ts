import { z } from "zod";

import { agentJson, agentRoute } from "@/lib/agent/handler";
import { addNoteAs } from "@/lib/services/admin/notes";

export const dynamic = "force-dynamic";

const body = z.object({ entity_type: z.enum(["vendor", "profile", "event", "post"]), entity_id: z.uuid(), note: z.string() });

/** Append-only internal note (stored in the audit log); audited as actor_role = 'agent'. */
export const POST = agentRoute("notes:write", async (req, agent) => {
  const b = body.parse(await agentJson(req));
  await addNoteAs({ id: agent.createdBy, role: "agent" }, `public.${b.entity_type}s`, b.entity_id, b.note, { ip: agent.ip, userAgent: req.headers.get("user-agent") }, { agent_key: agent.keyId });
  return { added: true };
});
