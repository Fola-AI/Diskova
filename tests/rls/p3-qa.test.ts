/** Stage P3 · community Q&A: moderation applies, pinned seeds render first, badges/votes/accept rules. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { SessionContext } from "@/lib/auth/guards";
import { createPinnedSeed, qaAdminAction } from "@/lib/services/admin/qa";
import { decideModerationItem } from "@/lib/services/admin/moderation";
import { acceptAnswer, answerQuestion, askQuestion, getQuestion, listQuestions, QaError, toggleVote } from "@/lib/services/qa";

import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv ? describe : describe.skip;
const meta = { ip: null, userAgent: "vitest" };

d("P3 · community Q&A", () => {
  let asker: TestUser;
  let local: TestUser;
  let owner: TestUser;
  let mod: SessionContext;
  let adm: SessionContext;
  let vendor: { id: string; slug: string };
  let cityId = "";
  let qid = "";
  let localAnswer = "";
  const phrase = `zzqablock${Date.now().toString(36)}`;
  let blocklist: string[] = [];

  beforeAll(async () => {
    const svc = serviceClient();
    const [a, l, o, m, ad] = await Promise.all(["p3-asker", "p3-local", "p3-owner", "p3-mod", "p3-admin"].map((x) => createUser(x)));
    [asker, local, owner] = [a, l, o];
    vendor = await createPublishedVendor("p3");
    cityId = (await svc.from("vendors").select("city_id").eq("id", vendor.id).single()).data!.city_id;
    await svc.from("vendor_members").insert({ vendor_id: vendor.id, profile_id: o.id, role: "owner", accepted_at: new Date().toISOString() });
    await svc.from("profiles").update({ role: "moderator" }).eq("id", m.id);
    await svc.from("profiles").update({ role: "admin" }).eq("id", ad.id);
    [mod, adm] = await Promise.all([sessionFor(m), sessionFor(ad)]);
    blocklist = (await svc.from("platform_settings").select("blocklist_phrases").eq("id", 1).single()).data!.blocklist_phrases;
    await svc.from("platform_settings").update({ blocklist_phrases: [...blocklist, phrase] }).eq("id", 1);
  });
  afterAll(async () => {
    const svc = serviceClient();
    await svc.from("platform_settings").update({ blocklist_phrases: blocklist }).eq("id", 1);
    await svc.from("qa_questions").delete().eq("city_id", cityId).like("title", "%P3 test%");
    await cleanup();
  });

  it("a clean question is moderated and published; anon can read it", async () => {
    const r = await askQuestion(await sessionFor(asker), { vendorId: vendor.id, title: "P3 test: is there parking after 10pm?" });
    expect(r.status).toBe("published");
    qid = r.id;
    const { data } = await anonClient().from("qa_questions").select("id, city_id, status").eq("id", qid).single();
    expect(data).toMatchObject({ status: "published", city_id: cityId }); // city derived from the venue
  });

  it("moderation applies: blocked wording is hidden, queued as P1, and invisible to others", async () => {
    const r = await askQuestion(await sessionFor(asker), { cityId, title: `P3 test: where to buy ${phrase} tonight?` });
    expect(r.status).toBe("hidden");
    const { data: item } = await serviceClient().from("moderation_items").select("id, priority, source, status").eq("entity_type", "qa_question").eq("entity_id", r.id).single();
    expect(item).toMatchObject({ priority: 1, source: "auto_block", status: "open" });
    expect((await anonClient().from("qa_questions").select("id").eq("id", r.id)).data).toEqual([]);
    expect((await asker.client.from("qa_questions").select("id").eq("id", r.id)).data).toHaveLength(1); // the author still sees it
    // A moderator approves it from the queue → published.
    await decideModerationItem(mod, { itemId: item!.id, action: "approve" }, meta);
    expect((await serviceClient().from("qa_questions").select("status").eq("id", r.id).single()).data!.status).toBe("published");
  });

  it("API callers can't publish, pin or mark answers official", async () => {
    const pin = await asker.client.from("qa_questions").insert({ city_id: cityId, title: "P3 test: sneaky pinned one", is_pinned: true } as never);
    expect(pin.error).not.toBeNull();
    const pub = await asker.client.from("qa_questions").update({ status: "published" } as never).eq("id", qid);
    expect(pub.error).not.toBeNull();
    const off = await local.client.from("qa_answers").insert({ question_id: qid, body: "trust me", is_official: true } as never);
    expect(off.error).not.toBeNull();
  });

  it("answers: venue members get the venue badge; votes count once and not on your own answer", async () => {
    localAnswer = (await answerQuestion(await sessionFor(local), { questionId: qid, body: "Yes — the lot behind the building, ₦1,000." })).id;
    const ownerAnswer = (await answerQuestion(await sessionFor(owner), { questionId: qid, body: "We have valet from 9pm on weekends." })).id;
    const { data: rows } = await serviceClient().from("qa_answers").select("id, is_vendor_answer, status").in("id", [localAnswer, ownerAnswer]);
    expect(rows!.find((r) => r.id === ownerAnswer)).toMatchObject({ is_vendor_answer: true, status: "published" });
    expect(rows!.find((r) => r.id === localAnswer)).toMatchObject({ is_vendor_answer: false });
    expect(await toggleVote(await sessionFor(asker), localAnswer)).toEqual({ voted: true, count: 1 });
    expect(await toggleVote(await sessionFor(asker), localAnswer)).toEqual({ voted: false, count: 0 });
    await expect(toggleVote(await sessionFor(local), localAnswer)).rejects.toBeInstanceOf(QaError); // own answer
    await toggleVote(await sessionFor(owner), localAnswer);
    expect((await serviceClient().from("qa_questions").select("answer_count").eq("id", qid).single()).data!.answer_count).toBe(2);
  });

  it("only the asker can accept, and only an answer to their question", async () => {
    await expect(acceptAnswer(await sessionFor(local), qid, localAnswer)).rejects.toBeInstanceOf(QaError);
    await acceptAnswer(await sessionFor(asker), qid, localAnswer);
    const q = await getQuestion(qid);
    expect(q!.accepted_answer_id).toBe(localAnswer);
    expect(q!.answers[0]!.id).toBe(localAnswer); // accepted first
    const other = await askQuestion(await sessionFor(local), { cityId, title: "P3 test: best suya near the bridge?" });
    await expect(acceptAnswer(await sessionFor(local), other.id, localAnswer)).rejects.toBeInstanceOf(QaError);
  });

  it("pinned seeds render first, with the official answer accepted", async () => {
    const id = await createPinnedSeed(adm, { cityId, title: "P3 test: how do I get around safely at night?", answer: "Use ride-hailing apps and share your trip with a friend." }, meta);
    const list = await listQuestions({ cityId }, 50);
    expect(list[0]!.id).toBe(id);
    expect(list[0]!.is_pinned).toBe(true);
    expect(list[0]!.answers[0]).toMatchObject({ is_official: true });
    expect(list[0]!.accepted_answer_id).toBe(list[0]!.answers[0]!.id);
  });

  it("three reports hide an answer; admins can remove (reason required) and it's audited", async () => {
    const reporters = await Promise.all(["p3-r1", "p3-r2", "p3-r3"].map((x) => createUser(x)));
    for (const r of reporters) await r.client.from("reports").insert({ reporter_id: r.id, entity_type: "qa_answer", entity_id: localAnswer, reason: "spam" });
    expect((await serviceClient().from("qa_answers").select("status, report_count").eq("id", localAnswer).single()).data).toEqual({ status: "hidden", report_count: 3 });
    await expect(qaAdminAction(mod, { kind: "answer", id: localAnswer, action: "remove", reason: "" }, meta)).rejects.toThrow();
    await qaAdminAction(mod, { kind: "answer", id: localAnswer, action: "remove", reason: "Spam link" }, meta);
    expect((await serviceClient().from("qa_answers").select("status").eq("id", localAnswer).single()).data!.status).toBe("removed");
    const { data: audit } = await serviceClient().rpc("admin_list_audit", { p_action_prefix: "qa.remove", p_entity_id: localAnswer, p_limit: 1 });
    expect(audit?.[0]?.reason).toBe("Spam link");
  });

  it("a shadowbanned asker's questions are hidden from everyone else", async () => {
    const svc = serviceClient();
    const shadow = await createUser("p3-shadow");
    const r = await askQuestion(await sessionFor(shadow), { cityId, title: "P3 test: shadow question about parking" });
    await svc.from("user_sanctions").insert({ profile_id: shadow.id, kind: "shadowban", reason: "test", issued_by: mod.user.id });
    expect((await anonClient().from("qa_questions").select("id").eq("id", r.id)).data).toEqual([]);
    expect((await shadow.client.from("qa_questions").select("id").eq("id", r.id)).data).toHaveLength(1);
  });
});
