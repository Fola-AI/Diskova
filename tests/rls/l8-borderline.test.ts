/**
 * Stage L8: borderline content publishes and is queued (publish-then-review); an unavailable provider
 * fails safe. The moderation provider is mocked here to control the scores exactly.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/moderation/openai", () => ({
  moderateTextScores: vi.fn(async (text: string) => (text.includes("UNAVAILABLE") ? null : text.includes("BORDER") ? { harassment: 0.62 } : { harassment: 0.01 })),
  moderateImageScores: vi.fn(async () => ({ sexual: 0.01 })),
}));

import { createCheckin, finalizeCheckin } from "@/lib/services/posts";

import { cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv ? describe : describe.skip;

d("L8 · borderline and fail-safe", () => {
  let user: TestUser;
  let vendorId: string;

  beforeAll(async () => {
    user = await createUser("l8-border");
    await serviceClient().from("profiles").update({ created_at: new Date(Date.now() - 40 * 86_400_000).toISOString() }).eq("id", user.id);
    vendorId = (await createPublishedVendor("l8-border")).id;
  });
  afterAll(cleanup);

  async function queue(postId: string) {
    const { data } = await serviceClient().from("moderation_items").select("source, priority").eq("entity_id", postId);
    return data ?? [];
  }

  it("a borderline score (≥ flag, < block) publishes and is queued P2", async () => {
    const s = await sessionFor(user);
    const c = await createCheckin(s, { vendorId, crowdLevel: 3, vibe: 3, photoCount: 0, note: "BORDER text" }, { ip: null });
    expect(await finalizeCheckin(s, c.postId)).toMatchObject({ status: "published", decision: "auto_flag" });
    expect(await queue(c.postId)).toEqual(expect.arrayContaining([{ source: "auto_flag", priority: 2 }]));
  });

  it("if moderation is unavailable the post is flagged for review, never silently passed", async () => {
    const s = await sessionFor(user);
    const c = await createCheckin(s, { vendorId, crowdLevel: 3, vibe: 3, photoCount: 0, note: "UNAVAILABLE right now" }, { ip: null });
    expect(await finalizeCheckin(s, c.postId)).toMatchObject({ status: "published", decision: "auto_flag" });
  });
});
