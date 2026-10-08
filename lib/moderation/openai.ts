import * as Sentry from "@sentry/nextjs";
import OpenAI from "openai";
import sharp from "sharp";

import { serverEnv } from "@/lib/env.server";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/moderation/openai");

/**
 * OpenAI moderation (§8.5) — `omni-moderation-latest`, text + images. The API key is restricted to
 * /v1/moderations (CLAUDE.md); nothing else is ever called with it.
 * Returns per-category scores, or null when moderation is unavailable (no key / error / timeout) so
 * callers can fail safe.
 */
const TIMEOUT_MS = 3500; // keeps every pipeline request comfortably under 5 s

let client: OpenAI | null | undefined;
function openai(): OpenAI | null {
  if (client === undefined) {
    const key = serverEnv().OPENAI_API_KEY;
    client = key ? new OpenAI({ apiKey: key, timeout: TIMEOUT_MS, maxRetries: 0 }) : null;
  }
  return client;
}

export type Scores = Record<string, number>;

function mergeMax(results: Array<{ category_scores: object }>): Scores {
  const out: Scores = {};
  for (const r of results) {
    for (const [k, v] of Object.entries(r.category_scores as Record<string, number>)) {
      out[k] = Math.max(out[k] ?? 0, Number(v) || 0);
    }
  }
  return out;
}

export async function moderateTextScores(text: string): Promise<Scores | null> {
  const c = openai();
  if (!c) return null;
  try {
    const res = await c.moderations.create({ model: "omni-moderation-latest", input: text.slice(0, 4000) });
    return mergeMax(res.results);
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "moderation", kind: "text" } });
    return null;
  }
}

/** Images are sent as a small JPEG data URL (fast, and works for any input format). */
export async function moderateImageScores(image: Buffer): Promise<Scores | null> {
  const c = openai();
  if (!c) return null;
  try {
    const jpeg = await sharp(image).resize(512, 512, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
    const res = await c.moderations.create({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } }],
    });
    return mergeMax(res.results);
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "moderation", kind: "image" } });
    return null;
  }
}
