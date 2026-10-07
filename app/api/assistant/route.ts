import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSession } from "@/lib/auth/guards";
import { FEATURES } from "@/lib/config";
import { clientIpFrom } from "@/lib/http/request-meta";
import { ask, askSchema, AssistantError } from "@/lib/services/assistant";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST /api/assistant { question, city?, history? } → streamed plain text (PRD P5). */
export async function POST(req: Request): Promise<Response> {
  if (!FEATURES.aiAssistant) return NextResponse.json({ error: "Not available." }, { status: 404 });
  let body: unknown;
  try {
    body = askSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof ZodError ? err.issues[0]?.message ?? "Invalid request." : "Send JSON." }, { status: 400 });
  }
  const session = await getSession();
  try {
    const r = await ask(body, { userId: session?.user.id ?? null, ip: clientIpFrom(req.headers) });
    const encoded = r.stream.pipeThrough(new TextEncoderStream());
    return new Response(encoded, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Assistant-Mode": r.mode,
        // Base64 JSON (header-safe): the venues the answer may link to.
        "X-Assistant-Venues": Buffer.from(JSON.stringify({ city: r.city, offered: r.offered }), "utf8").toString("base64"),
      },
    });
  } catch (err) {
    if (err instanceof AssistantError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof ZodError) return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
