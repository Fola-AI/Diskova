/** Stage L13 · security hardening checks that need DEV (Supabase, Upstash, Postgres). */
import { randomUUID } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getRedis, rateLimit } from "@/lib/ratelimit";
import { BACKUPS_BUCKET, runBackup } from "@/lib/services/admin/backup";
import { createPulse, PostError } from "@/lib/services/posts";

import { hasPsql, runPsql } from "../helpers/psql";
import { anonClient, cleanup, createPublishedVendor, createUser, hasDevEnv, serviceClient } from "./helpers";
import { sessionFor } from "./session";

const d = hasDevEnv ? describe : describe.skip;
const dsql = hasPsql ? describe : describe.skip;
const lastJson = (out: string) => JSON.parse(out.trim().split("\n").at(-1)!) as Record<string, string>;

dsql("L13 · audit log is append-only even for service_role and the owner", () => {
  it("UPDATE / DELETE / TRUNCATE are refused (42501) for postgres and service_role", () => {
    const res = runPsql({ file: "tests/sql/audit-immutability.sql" });
    expect(res.ok, res.stderr).toBe(true);
    expect(lastJson(res.stdout)).toEqual({
      "postgres.update": "42501", "postgres.delete": "42501", "postgres.truncate": "42501",
      "service_role.update": "42501", "service_role.delete": "42501", "service_role.truncate": "42501",
    });
  });

  it("the service role can't even reach audit_log through the Data API", async () => {
    const res = await serviceClient().schema("private" as "public").from("audit_log" as "posts").delete().neq("id", "0");
    expect(res.error).not.toBeNull();
  });
});

dsql("L13 · daily purge jobs", () => {
  it("anonymise deleted accounts, remove abandoned posts, purge decided verification docs and old snapshots — and audit the run", () => {
    const res = runPsql({ file: "tests/sql/purges.sql" });
    expect(res.ok, res.stderr).toBe(true);
    const r = lastJson(res.stdout);
    expect(r.post_status).toBe("removed");
    expect(r.post_deleted).toBe("true");
    expect(r.live_author_untouched).toBe("true");
    expect(r.username_anonymised).toBe("true");
    expect(r.display_name).toBe("∅");
    expect(r.ip_cleared).toBe("true");
    expect(r.req_no_files_purged).toBe("true");
    expect(r.old_snapshot_left).toBe("0");
    expect(r.audited).toBe("1");
    // Files can only be deleted once the Vault secrets exist (open question 4). Until then a request
    // with stored files must never be marked purged.
    expect(r.req_with_files_marked).toBe(r.vault_configured);
  });
});

d("L13 · signed URLs expire", () => {
  const path = `l13-test/${randomUUID()}.png`;
  // 1×1 transparent PNG
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

  beforeAll(async () => {
    const { error } = await serviceClient().storage.from("verification-docs").upload(path, png, { contentType: "image/png" });
    if (error) throw error;
  });
  afterAll(async () => {
    await serviceClient().storage.from("verification-docs").remove([path]);
  });

  it("verification documents are private and their signed links stop working after expiry", async () => {
    const svc = serviceClient();
    const publicUrl = svc.storage.from("verification-docs").getPublicUrl(path).data.publicUrl;
    expect((await fetch(publicUrl)).ok).toBe(false);

    const { data } = await svc.storage.from("verification-docs").createSignedUrl(path, 2);
    expect((await fetch(data!.signedUrl)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 3500));
    const expired = await fetch(data!.signedUrl);
    expect(expired.ok).toBe(false);
    expect([400, 401, 403]).toContain(expired.status);
  });
});

const dredis = hasDevEnv && process.env.UPSTASH_REDIS_REST_URL ? describe : describe.skip;

dredis("L13 · rate limits (Upstash, sliding window)", () => {
  it("is configured against a real Redis", () => {
    expect(getRedis()).not.toBeNull();
  });

  it("reportUser: 10 per hour per user, the 11th is refused", async () => {
    const key = `test-${randomUUID()}`;
    for (let i = 0; i < 10; i++) expect((await rateLimit("reportUser", key)).ok).toBe(true);
    const blocked = await rateLimit("reportUser", key);
    expect(blocked.ok).toBe(false);
    expect(blocked.reset).toBeGreaterThan(Date.now());
  });

  it("postUser honours the platform setting override (6/h)", async () => {
    const key = `test-${randomUUID()}`;
    for (let i = 0; i < 6; i++) expect((await rateLimit("postUser", key, { tokens: 6 })).ok).toBe(true);
    expect((await rateLimit("postUser", key, { tokens: 6 })).ok).toBe(false);
  });

  it("keys are independent: one user's limit never blocks another (per-user first)", async () => {
    const a = `test-${randomUUID()}`;
    for (let i = 0; i < 3; i++) await rateLimit("pulseUserVendor", a);
    expect((await rateLimit("pulseUserVendor", `test-${randomUUID()}`)).ok).toBe(true);
  });
});

d("L13 · rate limits enforced end-to-end in a service", () => {
  afterAll(cleanup);

  it("a third pulse on the same venue within 30 minutes is refused", async () => {
    if (!process.env.UPSTASH_REDIS_REST_URL) return;
    const u = await createUser("l13-pulse");
    const v = await createPublishedVendor("l13-pulse");
    const session = await sessionFor(u);
    const input = { vendorId: v.id, crowdLevel: 3 };
    await createPulse(session, input, { ip: null });
    await createPulse(session, input, { ip: null });
    await expect(createPulse(session, input, { ip: null })).rejects.toBeInstanceOf(PostError);
  });
});

d("L13 · weekly backup to a private bucket", () => {
  it("dumps every public + private table (not activity telemetry) as gzipped NDJSON, prunes > 8 weeks, audits", async () => {
    const svc = serviceClient();
    const stale = "weekly/2000-01-01.ndjson.gz";
    await svc.storage.from(BACKUPS_BUCKET).upload(stale, gzipSync("{}\n"), { contentType: "application/gzip", upsert: true });

    const r = await runBackup();
    try {
      expect(r.pruned).toContain(stale);
      const { data: blob, error } = await svc.storage.from(BACKUPS_BUCKET).download(r.path);
      expect(error).toBeNull();
      const lines = gunzipSync(Buffer.from(await blob!.arrayBuffer())).toString("utf8").trim().split("\n");
      const header = JSON.parse(lines[0]!) as { kind: string; tables: string[] };
      expect(header.kind).toBe("header");
      expect(header.tables).toEqual(expect.arrayContaining(["public.vendors", "public.profiles", "private.audit_log", "private.issue_reports", "private.vendor_verification_requests"]));
      expect(header.tables).not.toContain("public.activity_events");
      const vendorRows = lines.filter((l) => l.startsWith('{"t":"public.vendors"')).length;
      expect(vendorRows).toBe(r.tables["public.vendors"]);
      expect(r.tables["private.audit_log"]).toBeGreaterThan(0);

      // Private: no public URL, and anon can't download it.
      expect((await fetch(svc.storage.from(BACKUPS_BUCKET).getPublicUrl(r.path).data.publicUrl)).ok).toBe(false);
      const { data: list } = await svc.rpc("admin_list_audit", { p_action_prefix: "system.backup", p_limit: 1 });
      expect(list?.[0]?.entity_id).toBe(r.path);
    } finally {
      await svc.storage.from(BACKUPS_BUCKET).remove([r.path]);
    }
  }, 120_000);

  it("the backup RPCs are service-role only and refuse tables outside the backup set", async () => {
    const anon = await anonClient().rpc("admin_backup_rows", { p_schema: "private", p_table: "audit_log" });
    expect(anon.error).not.toBeNull();
    const auth = await serviceClient().rpc("admin_backup_rows", { p_schema: "auth", p_table: "users" });
    expect(auth.error?.message).toMatch(/not in backup set/);
  });
});
