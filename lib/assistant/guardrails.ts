/**
 * AI assistant guardrails (PRD P5). Pure functions shared by the server and the chat UI.
 *  - Safety questions never reach the model: they get a fixed answer pointing to /safety/[city] + 112.
 *  - The model may only name venues as [[slug]] tokens from the context we gave it; the UI links a
 *    token only if its slug was offered, so the assistant can't invent a venue (or a link to one).
 */

/** Groq retired llama-3.3-70b-versatile on 16 Aug 2026; its recommended replacement is openai/gpt-oss-120b. */
const RETIRED_GROQ_MODELS: Record<string, string> = {
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b": "openai/gpt-oss-120b",
};
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export function resolveGroqModel(configured: string | undefined): string {
  const m = configured?.trim();
  if (!m) return DEFAULT_GROQ_MODEL;
  return RETIRED_GROQ_MODELS[m] ?? m;
}

const SAFETY_PATTERNS = [
  /\b(road|roads|highway|expressway|traffic)\s+(safe|safety|danger|dangerous|accident|accidents)\b/i,
  /\b(safe|safety|dangerous|danger)\b.*\b(road|roads|drive|driving|highway|expressway|travel|night|area|neighbou?rhood|walk|walking|okada|keke|bus|danfo)\b/i,
  /\b(is|are)\b.*\b(safe|dangerous|unsafe)\b/i,
  /\b(robbery|robbed|rob|mugging|mugged|kidnap\w*|crime|criminals?|armed|shooting|attack\w*|assault\w*|harass\w*|scam(?:mers?)?|police|emergency|emergencies|ambulance|hospital|accident|stolen|theft|danger)\b/i,
  /\b(curfew|unrest|protest|riot|checkpoint|area boys)\b/i,
];

export function isSafetyQuestion(text: string): boolean {
  return SAFETY_PATTERNS.some((re) => re.test(text));
}

export function safetyReply(city: { slug: string; name: string } | null): string {
  const page = city ? `/safety/${city.slug}` : "/safety";
  return [
    `I can't give safety advice. Please check our safety information${city ? ` for ${city.name}` : ""}: [[safety:${page}]]`,
    "If you're in danger right now, call 112 (free from any phone in Nigeria).",
    "I'm happy to help with where's busy tonight, places to eat, events and prices.",
  ].join("\n\n");
}

/** Tokens the model may emit: [[venue-slug]] or [[safety:/safety/lagos]]. */
export const TOKEN_RE = /\[\[([a-z0-9-]{2,120}|safety:\/safety(?:\/[a-z0-9-]+)?)\]\]/g;

export type Segment = { type: "text"; text: string } | { type: "venue"; slug: string; name: string } | { type: "safety"; href: string } | { type: "unknown"; slug: string };

/** Split assistant text into renderable segments; only offered slugs become venue links. */
export function segmentAnswer(text: string, offered: Record<string, string>): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    if (m.index! > last) out.push({ type: "text", text: text.slice(last, m.index) });
    const token = m[1]!;
    if (token.startsWith("safety:")) out.push({ type: "safety", href: token.slice(7) });
    else if (offered[token]) out.push({ type: "venue", slug: token, name: offered[token]! });
    else out.push({ type: "unknown", slug: token });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

export function linkedVenues(text: string, offered: Record<string, string>): string[] {
  return [...new Set(segmentAnswer(text, offered).flatMap((s) => (s.type === "venue" ? [s.slug] : [])))];
}
