import { describe, expect, it } from "vitest";

import { DEFAULT_GROQ_MODEL, isSafetyQuestion, linkedVenues, resolveGroqModel, safetyReply, segmentAnswer } from "@/lib/assistant/guardrails";

describe("assistant guardrails (P5)", () => {
  it("routes safety questions away from the model", () => {
    for (const q of ["Is the Lekki-Epe expressway safe at night?", "how dangerous is driving to Ibadan", "Is Yaba safe to walk around?", "what do I do if I get robbed", "nearest hospital?", "road safety tips for okada"]) {
      expect(isSafetyQuestion(q), q).toBe(true);
    }
    for (const q of ["Where is busy in Lekki now?", "best suya near VI", "rooftop bars with live music this weekend", "how much is entry at the beach clubs"]) {
      expect(isSafetyQuestion(q), q).toBe(false);
    }
  });

  it("the safety reply links the city safety page and 112, and never promises action", () => {
    const r = safetyReply({ slug: "lagos", name: "Lagos" });
    expect(r).toContain("[[safety:/safety/lagos]]");
    expect(r).toContain("112");
    expect(r).not.toMatch(/authorities will|police will/i);
  });

  it("only offered venues become links; invented slugs stay plain", () => {
    const offered = { "afrobeat-junction-lagos": "Afrobeat Junction" };
    const segs = segmentAnswer("Try [[afrobeat-junction-lagos]] or [[made-up-club]]. Safety: [[safety:/safety/lagos]]", offered);
    expect(segs).toEqual([
      { type: "text", text: "Try " },
      { type: "venue", slug: "afrobeat-junction-lagos", name: "Afrobeat Junction" },
      { type: "text", text: " or " },
      { type: "unknown", slug: "made-up-club" },
      { type: "text", text: ". Safety: " },
      { type: "safety", href: "/safety/lagos" },
    ]);
    expect(linkedVenues("[[afrobeat-junction-lagos]] [[afrobeat-junction-lagos]] [[x-y]]", offered)).toEqual(["afrobeat-junction-lagos"]);
  });

  it("maps Groq's retired model to its recommended replacement", () => {
    expect(resolveGroqModel("llama-3.3-70b-versatile")).toBe("openai/gpt-oss-120b");
    expect(resolveGroqModel(undefined)).toBe(DEFAULT_GROQ_MODEL);
    expect(resolveGroqModel("openai/gpt-oss-20b")).toBe("openai/gpt-oss-20b");
  });
});
