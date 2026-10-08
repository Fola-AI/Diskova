/** Stage L12: back-office services — reasons required, role gates, audited exports, digest, filters. */
import { render } from "@react-email/components";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { DailyDigestEmail } from "@/lib/email/templates/admin";
import { isAuthorizedCron } from "@/lib/http/cron-auth";
import { buildCsvExport } from "@/lib/services/admin/csv-export";
import { buildDigest } from "@/lib/services/admin/digest";
import { bulkPostAction } from "@/lib/services/admin/posts";
import { addBlocklistPhrase, updateSettings } from "@/lib/services/admin/settings";
import { userAction } from "@/lib/services/admin/users";
import { listVendorsTable, vendorAdminAction } from "@/lib/services/admin/vendors";

import { cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient, type TestUser } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv ? describe : describe.skip;
const meta = { ip: null, userAgent: "vitest" };

async function auditCount(action: string, actorId: string): Promise<number> {
  const { data } = await serviceClient().rpc("admin_list_audit", { p_action_prefix: action, p_actor_id: actorId, p_limit: 100 });
  return (data ?? []).filter((r) => r.action === action).length;
}

d("L12 · back office", () => {
  let target: TestUser;
  let plain: TestUser;
  let mod: SessionContext;
  let adm: SessionContext;
  let sup: SessionContext;
  let vendor: { id: string; slug: string };
  let postId = "";

  beforeAll(async () => {
    const [t, p, m, a, s] = await Promise.all(["l12-target", "l12-plain", "l12-mod", "l12-admin", "l12-super"].map((l) => createUser(l)));
    target = t;
    plain = p;
    const svc = serviceClient();
    await svc.from("profiles").update({ role: "moderator" }).eq("id", m.id);
    await svc.from("profiles").update({ role: "admin" }).eq("id", a.id);
    await svc.from("profiles").update({ role: "super_admin" }).eq("id", s.id);
    [mod, adm, sup] = await Promise.all([sessionFor(m), sessionFor(a), sessionFor(s)]);
    vendor = await createPublishedVendor("l12");
    const { data: post } = await svc.from("posts").insert({ author_id: t.id, vendor_id: vendor.id, kind: "pulse", crowd_level: 3 }).select("id").single();
    postId = post!.id;
  });

  afterAll(cleanup);

  it("destructive user actions require a reason and nothing is written without one", async () => {
    await expect(userAction(mod, { userId: target.id, action: "suspend", reason: "" }, meta)).rejects.toBeInstanceOf(ZodError);
    const { count } = await serviceClient().from("user_sanctions").select("id", { count: "exact", head: true }).eq("profile_id", target.id);
    expect(count).toBe(0);
    expect(await auditCount("user.suspend", mod.user.id)).toBe(0);
  });

  it("a warning with a reason creates the sanction and an audit row", async () => {
    await userAction(mod, { userId: target.id, action: "warn", reason: "Repeated off-topic posts", days: 7 }, meta);
    const { data } = await serviceClient().from("user_sanctions").select("kind, reason").eq("profile_id", target.id);
    expect(data).toEqual([{ kind: "warning", reason: "Repeated off-topic posts" }]);
    expect(await auditCount("user.warn", mod.user.id)).toBe(1);
  });

  it("moderators cannot ban; admins can't act on staff accounts", async () => {
    await expect(userAction(mod, { userId: target.id, action: "ban", reason: "Not allowed for mods" }, meta)).rejects.toThrow(/Only admins/);
    await expect(userAction(adm, { userId: mod.user.id, action: "warn", reason: "Staff target check" }, meta)).rejects.toThrow(/super admin/);
  });

  it("bulk post hide requires a reason, then hides and audits", async () => {
    await expect(bulkPostAction(mod, { ids: [postId], action: "hide", reason: "" }, meta)).rejects.toBeInstanceOf(ZodError);
    expect(await bulkPostAction(mod, { ids: [postId], action: "hide", reason: "Spam wave cleanup" }, meta)).toBe(1);
    const { data } = await serviceClient().from("posts").select("status").eq("id", postId).single();
    expect(data?.status).toBe("hidden");
    expect(await auditCount("post.bulk_hide", mod.user.id)).toBe(1);
  });

  it("suspending a vendor requires a reason and is audited", async () => {
    await expect(vendorAdminAction(adm, vendor.id, "suspend", "", meta)).rejects.toBeInstanceOf(ZodError);
    await vendorAdminAction(adm, vendor.id, "suspend", "Misleading listing", meta);
    const { data } = await serviceClient().from("vendors").select("status").eq("id", vendor.id).single();
    expect(data?.status).toBe("suspended");
    expect(await auditCount("vendor.suspend", adm.user.id)).toBe(1);
    await vendorAdminAction(adm, vendor.id, "unsuspend", null, meta);
  });

  it("vendor table filters work (no prices / never posted / search)", async () => {
    const { rows } = await listVendorsTable({ q: vendor.slug, noPrices: true });
    expect(rows.map((r) => r.id)).toContain(vendor.id);
    expect(rows.every((r) => !r.has_prices)).toBe(true);
    const neverPosted = await listVendorsTable({ q: vendor.slug, neverPosted: true });
    expect(neverPosted.rows.map((r) => r.id)).not.toContain(vendor.id); // it has a post
  });

  it("only super_admin can change platform settings", async () => {
    const { data: s } = await serviceClient().from("platform_settings").select("*").eq("id", 1).single();
    const form = {
      ...s!,
      monetisation_notice_md: s!.monetisation_notice_md ?? "",
      december_season_start: s!.december_season_start ?? "",
      december_season_end: s!.december_season_end ?? "",
      fx_gbp_per_ngn: s!.fx_gbp_per_ngn ?? "",
      fx_usd_per_ngn: s!.fx_usd_per_ngn ?? "",
      listing_is_free: s!.listing_is_free ? "on" : "",
      maintenance_mode: s!.maintenance_mode ? "on" : "",
      blocklist_phrases: s!.blocklist_phrases.join("\n"),
      reason: "No-op settings save from tests",
    };
    await expect(updateSettings(adm, form, meta)).rejects.toThrow(/super admin/);
    await updateSettings(sup, form, meta);
    expect(await auditCount("settings.updated", sup.user.id)).toBe(1);
    const { data: after } = await serviceClient().from("platform_settings").select("*").eq("id", 1).single();
    expect({ ...after, updated_at: null }).toEqual({ ...s, updated_at: null });
  });

  it("moderators can add a blocklist phrase from the queue (audited)", async () => {
    const svc = serviceClient();
    const phrase = `zz-test-phrase-${Date.now().toString(36)}`;
    try {
      await expect(addBlocklistPhrase(mod, "ab", meta)).rejects.toBeInstanceOf(ZodError);
      await addBlocklistPhrase(mod, phrase, meta);
      const { data } = await svc.from("platform_settings").select("blocklist_phrases").eq("id", 1).single();
      expect(data?.blocklist_phrases).toContain(phrase);
      expect(await auditCount("blocklist.phrase_added", mod.user.id)).toBe(1);
    } finally {
      const { data } = await svc.from("platform_settings").select("blocklist_phrases").eq("id", 1).single();
      await svc.from("platform_settings").update({ blocklist_phrases: (data?.blocklist_phrases ?? []).filter((p) => p !== phrase) }).eq("id", 1);
    }
  });

  it("user CSV export is super_admin only and audited; IPs are never exported", async () => {
    await expect(buildCsvExport(adm, "users", { q: "rls-l12" }, meta)).rejects.toThrow("forbidden");
    expect(await auditCount("export.users", adm.user.id)).toBe(0);
    const { csv, rows } = await buildCsvExport(sup, "users", { q: "rls-l12-target" }, meta);
    expect(rows).toBe(1);
    expect(csv.split("\r\n")[0]).toContain("email");
    expect(csv).not.toMatch(/signup_ip|last_ip/);
    expect(csv).toContain(target.email);
    expect(await auditCount("export.users", sup.user.id)).toBe(1);
  });

  it("admins can export vendors (audited)", async () => {
    const { csv } = await buildCsvExport(adm, "vendors", { q: vendor.slug }, meta);
    expect(csv).toContain(vendor.slug);
    expect(await auditCount("export.vendors", adm.user.id)).toBe(1);
  });

  it("the daily digest builds and renders without user content", async () => {
    const data = await buildDigest();
    expect(data.openModeration).toBeGreaterThanOrEqual(data.openP1);
    const html = await render(DailyDigestEmail({ d: data }));
    expect(html).toContain("Daily digest");
    expect(html).toContain("Open moderation items");
  });

  it("the digest cron rejects requests without the secret", () => {
    expect(isAuthorizedCron(new Request("http://x/api/cron/digest"))).toBe(false);
    expect(isAuthorizedCron(new Request("http://x/api/cron/digest", { headers: { authorization: "Bearer wrong" } }))).toBe(false);
    expect(isAuthorizedCron(new Request("http://x/api/cron/digest", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))).toBe(true);
  });

  it("activity_events are invisible to normal users over the API (staff-only stream)", async () => {
    const { data } = await plain.client.from("activity_events").select("id").limit(5);
    expect(data ?? []).toEqual([]);
  });

  it("non-staff cannot join the private admin:activity broadcast channel", async () => {
    await plain.client.realtime.setAuth();
    const status = await new Promise<string>((resolve) => {
      const ch = plain.client.channel("admin:activity", { config: { private: true } });
      const timer = setTimeout(() => resolve("TIMEOUT"), 8000);
      ch.subscribe((s) => {
        if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR") {
          clearTimeout(timer);
          resolve(s);
          void plain.client.removeChannel(ch);
        }
      });
    });
    expect(status).toBe("CHANNEL_ERROR");
  });

  it("hard-deleting a post closes its open moderation item (no orphans in the queue)", async () => {
    const svc = serviceClient();
    const { data: p } = await svc.from("posts").insert({ author_id: target.id, vendor_id: vendor.id, kind: "pulse", crowd_level: 2 }).select("id").single();
    await svc.from("moderation_items").insert({ entity_type: "post", entity_id: p!.id, source: "random_sample", priority: 5 });
    await svc.from("posts").delete().eq("id", p!.id);
    const { data } = await svc.from("moderation_items").select("status, outcome").eq("entity_id", p!.id);
    expect(data).toEqual([{ status: "done", outcome: "entity_deleted" }]);
  });

  it("signing up logs a user.signup activity event", async () => {
    const { data } = await serviceClient().from("activity_events").select("kind").eq("profile_id", target.id).eq("kind", "user.signup");
    expect(data?.length).toBe(1);
  });
});
