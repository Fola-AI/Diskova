import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/admin-db/client";
import { getPlatformSettings } from "@/lib/admin-db/settings";
import { buildContext, resolveCity } from "@/lib/assistant/context";
import { isSafetyQuestion, linkedVenues, resolveGroqModel, safetyReply } from "@/lib/assistant/guardrails";
import { BRAND_NAME, SEASON_NAME } from "@/lib/config";
import { serverEnv } from "@/lib/env.server";
import { maxScore, moderateText } from "@/lib/moderation/text";
import { rateLimitAll, retryAfterText } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/assistant");

export class AssistantError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const askSchema = z.object({
  question: z.string().trim().min(3, "Ask a question.").max(500, "Keep it under 500 characters."),
  city: z.string().regex(/^[a-z0-9-]{2,60}$/).optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(6).default([]),
});

export interface AskResult {
  mode: "answer" | "safety" | "blocked";
  offered: Record<string, string>;
  city: { slug: string; name: string } | null;
  /** Text stream of the answer (tokens [[slug]] / [[safety:/safety/x]] are rendered by the UI). */
  stream: ReadableStream<string>;
}

function systemPrompt(cityName: string): string {
  return [
    `You are the ${BRAND_NAME} assistant: a friendly local guide to going out in ${cityName}, Nigeria (nightlife, food, beaches, events, ${SEASON_NAME}).`,
    "Answer ONLY from the CONTEXT below. Rules:",
    "1. Name venues ONLY by writing their exact [[slug]] token from the VENUES list (e.g. [[copper-lantern-rooftop-lagos]]). Never write a venue name without its token, never invent venues, never use a slug that is not in the list.",
    "2. 'Busy now' / crowd questions: use only the LIVE NOW lines. If none match, say there are no live reports for that right now and suggest checking back or pulsing a venue.",
    "3. Never state a price that is not in the context. If prices aren't listed, say so. Prices change — suggest confirming with the venue.",
    "4. Never give safety, security, crime, road, health or legal advice. For anything like that, reply with [[safety:/safety/<city-slug>]] and 112.",
    "5. Crowd levels are community reports, unverified unless marked official. Never claim certainty, never promise that anyone (venues, police, authorities) will act.",
    "6. Be concise: at most 6 short lines or a short bulleted list ('- '). Plain text only — no markdown headings, tables or links other than the tokens.",
    "7. If the question is unrelated to going out in Nigeria, say briefly what you can help with.",
  ].join("\n");
}

function textStream(text: string): ReadableStream<string> {
  return new ReadableStream({ start(c) { c.enqueue(text); c.close(); } });
}

async function log(entry: { profileId: string | null; cityId: string | null; question: string; answer: string; offered: number; linked: string[]; outcome: string; model: string | null; started: number }) {
  // Nullable columns: the generated RPC types mark every arg as string, but null is accepted.
  await getAdminSupabase().rpc("admin_log_assistant", {
    p_profile_id: entry.profileId as string, p_city_id: entry.cityId as string, p_question: entry.question, p_answer: entry.answer,
    p_venues_offered: entry.offered, p_venues_linked: entry.linked, p_outcome: entry.outcome, p_model: entry.model as string, p_latency_ms: Date.now() - entry.started,
  }).then(() => undefined, () => undefined);
}

/** PRD P5: 20/user/hour, 200/IP/hour; moderation + safety redirect before the model; logged. */
export async function ask(raw: unknown, who: { userId: string | null; ip: string | null }): Promise<AskResult> {
  const started = Date.now();
  const input = askSchema.parse(raw);
  const rl = await rateLimitAll([["assistantUser", who.userId], ["assistantIp", who.ip]]);
  if (!rl.ok) throw new AssistantError(`You've asked a lot in the last hour. Try again in ${retryAfterText(rl.reset)}.`, 429);

  const city = await resolveCity(input.city, input.question);
  const cityRef = city ? { slug: city.slug, name: city.name } : null;
  const base = { profileId: who.userId, cityId: city?.id ?? null, question: input.question, offered: 0, linked: [] as string[], model: null, started };

  if (isSafetyQuestion(input.question)) {
    const answer = safetyReply(cityRef);
    await log({ ...base, answer, outcome: "safety_redirect" });
    return { mode: "safety", offered: {}, city: cityRef, stream: textStream(answer) };
  }
  const settings = await getPlatformSettings();
  const mod = await moderateText(input.question, { blocklist: settings.blocklist_phrases });
  if (mod.blocklistHit || maxScore(mod) >= 0.8) {
    const answer = "I can't help with that. Ask me about places to go, what's busy, events or prices.";
    await log({ ...base, answer, outcome: "blocked" });
    return { mode: "blocked", offered: {}, city: cityRef, stream: textStream(answer) };
  }
  if (!city) throw new AssistantError("No cities are set up yet.", 503);
  const key = serverEnv().GROQ_API_KEY;
  if (!key) throw new AssistantError("The assistant isn't available right now.", 503);

  const ctx = await buildContext(city, input.question);
  const model = resolveGroqModel(serverEnv().GROQ_MODEL);
  const groq = createOpenAI({ apiKey: key, baseURL: "https://api.groq.com/openai/v1", name: "groq" });
  const result = streamText({
    model: groq.chat(model),
    system: `${systemPrompt(city.name)}\n\nCONTEXT\n${ctx.text}`,
    messages: [...input.history.map((m) => ({ role: m.role, content: m.content })), { role: "user" as const, content: input.question }],
    temperature: 0.3,
    maxOutputTokens: 700,
    providerOptions: { openai: { reasoningEffort: "low" } },
    abortSignal: AbortSignal.timeout(25_000),
    onFinish: async ({ text }) => {
      await log({ ...base, offered: Object.keys(ctx.offered).length, answer: text, linked: linkedVenues(text, ctx.offered), outcome: "answered", model });
    },
    onError: async () => {
      await log({ ...base, offered: Object.keys(ctx.offered).length, answer: "", outcome: "error", model });
    },
  });
  return { mode: "answer", offered: ctx.offered, city: cityRef, stream: result.textStream as unknown as ReadableStream<string> };
}
