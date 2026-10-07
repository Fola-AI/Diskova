import { NextResponse } from "next/server";

import { agentRoute } from "@/lib/agent/handler";
import { openApiDocument } from "@/lib/agent/registry";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

/** The OpenAPI document is returned bare (not wrapped in the envelope) so tools can load it directly. */
const wrapped = agentRoute("read", async () => openApiDocument(`${SITE_URL}/api/agent/v1`));
export async function GET(req: Request, ctx: unknown): Promise<NextResponse> {
  const res = await wrapped(req, ctx);
  if (!res.ok) return res;
  const body = (await res.json()) as { data: unknown };
  return NextResponse.json(body.data, { headers: { "Cache-Control": "no-store" } });
}
