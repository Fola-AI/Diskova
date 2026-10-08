/**
 * Stage L13 · RLS matrix: every role × every public table/view × {select, update, delete}, probed
 * by impersonating each role exactly as PostgREST does (role + JWT claims incl. `aal`), inside a
 * transaction that is always rolled back (tests/sql/rls-matrix.sql). Assertions are relative to
 * the same snapshot, so they don't depend on what data DEV happens to hold.
 */
import { beforeAll, describe, expect, it } from "vitest";

import { hasPsql, runPsql } from "../helpers/psql";

type Ops = { select: string; update?: string; delete?: string };
type Matrix = Record<string, Record<string, Ops>>;
interface CatalogTable { rel: string; kind: string; rls: boolean; policies: number; anon_write: boolean; auth_insert: boolean; auth_update: boolean; auth_delete: boolean; auth_truncate: boolean; security_invoker: boolean }
interface Catalog { public_tables: CatalogTable[]; private_table_grants: string[]; private_schema_usage: { anon: boolean; authenticated: boolean }; public_admin_rpcs_callable_by_api: string[]; partitions_reachable: string[]; api_truncate_or_trigger: string[]; default_privileges_api: string[] }

const d = hasPsql ? describe : describe.skip;

const STAFF_AAL1 = ["moderator", "admin", "super_admin"];
const STAFF_AAL2 = ["moderator_aal2", "admin_aal2", "super_admin_aal2"];
/** Tables nobody but the API's own row owner may write, and the only ones with API write grants. */
const API_WRITABLE = { insert: ["events", "list_items", "lists", "posts", "qa_answers", "qa_questions", "qa_votes", "reports", "vendor_prices", "vendors"], update: ["events", "list_items", "lists", "posts", "profiles", "qa_answers", "qa_questions", "vendor_prices", "vendors"], delete: ["list_items", "lists", "qa_votes", "vendor_prices"] };
/** Staff-only / owner-only tables anon must not even be able to query. */
const ANON_DENIED = ["activity_events", "admin_tasks", "guide_revisions", "list_items", "lists", "moderation_items", "point_events", "qa_votes", "reports", "user_sanctions", "vendor_members"];

const touched = (v: string | undefined) => Boolean(v && /^\d+$/.test(v) && Number(v) > 0);
const count = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : -1);

d("L13 · RLS matrix (every role × table)", () => {
  let m: Matrix;
  let cat: Catalog;

  beforeAll(() => {
    const probe = runPsql({ file: "tests/sql/rls-matrix.sql" });
    if (!probe.ok) throw new Error(probe.stderr);
    m = JSON.parse(probe.stdout.trim().split("\n").at(-1)!) as Matrix;
    const c = runPsql({ file: "tests/sql/rls-catalog.sql" });
    if (!c.ok) throw new Error(c.stderr);
    cat = JSON.parse(c.stdout.trim().split("\n").at(-1)!) as Catalog;
  }, 120_000);

  it("covers every public relation for every role", () => {
    const rels = cat.public_tables.map((t) => t.rel).sort();
    for (const role of ["anon", "user", "vendor_owner", ...STAFF_AAL1, ...STAFF_AAL2]) expect(Object.keys(m[role]!).sort()).toEqual(rels);
  });

  it("every public table has RLS enabled and at least one policy; views run as the invoker", () => {
    const tables = cat.public_tables.filter((t) => t.kind === "r" || t.kind === "p");
    expect(tables.filter((t) => !t.rls || t.policies === 0).map((t) => t.rel)).toEqual([]);
    expect(cat.public_tables.filter((t) => t.kind === "v" && !t.security_invoker).map((t) => t.rel)).toEqual([]);
  });

  it("API write grants are exactly the expected set; anon can write nothing; nobody can TRUNCATE", () => {
    const t = cat.public_tables;
    expect(t.filter((x) => x.anon_write).map((x) => x.rel)).toEqual([]);
    expect(t.filter((x) => x.auth_insert).map((x) => x.rel)).toEqual(API_WRITABLE.insert);
    expect(t.filter((x) => x.auth_update).map((x) => x.rel)).toEqual(API_WRITABLE.update);
    expect(t.filter((x) => x.auth_delete).map((x) => x.rel)).toEqual(API_WRITABLE.delete);
    expect(t.filter((x) => x.auth_truncate).map((x) => x.rel)).toEqual([]);
  });

  it("the private schema, admin RPCs and activity partitions are unreachable for API roles", () => {
    expect(cat.private_schema_usage).toEqual({ anon: false, authenticated: false });
    expect(cat.private_table_grants).toEqual([]);
    expect(cat.public_admin_rpcs_callable_by_api).toEqual([]);
    expect(cat.partitions_reachable).toEqual([]);
  });

  it("API roles hold no TRUNCATE / TRIGGER / REFERENCES anywhere, and new tables get no default grants", () => {
    expect(cat.api_truncate_or_trigger).toEqual([]);
    expect(cat.default_privileges_api).toEqual([]);
  });

  it("anon: denied on staff/owner tables, never updates or deletes anything", () => {
    for (const rel of ANON_DENIED) expect(m.anon![rel]!.select, rel).toMatch(/^denied:42501$/);
    for (const [rel, ops] of Object.entries(m.anon!)) {
      expect(touched(ops.update), `${rel} update`).toBe(false);
      expect(touched(ops.delete), `${rel} delete`).toBe(false);
    }
  });

  it("a plain user can update only their own profile row and delete nothing", () => {
    for (const [rel, ops] of Object.entries(m.user!)) {
      expect(count(ops.update) <= (rel === "profiles" ? 1 : 0), `${rel} update=${ops.update}`).toBe(true);
      expect(touched(ops.delete), `${rel} delete`).toBe(false);
    }
    expect(m.user!.profiles!.update).toBe("1");
  });

  it("staff WITHOUT MFA (aal1) have exactly the same access as a plain user", () => {
    for (const role of STAFF_AAL1) expect(m[role], role).toEqual(m.user);
  });

  it("a vendor owner touches only their own vendor, prices and membership", () => {
    const u = m.user!;
    const v = m.vendor_owner!;
    for (const [rel, ops] of Object.entries(v)) {
      if (["vendors", "vendor_prices", "vendor_members"].includes(rel)) continue;
      expect(ops, rel).toEqual(u[rel]);
    }
    expect(count(v.vendors!.select)).toBe(count(u.vendors!.select) + 1); // own draft
    expect(count(v.vendor_prices!.select)).toBe(count(u.vendor_prices!.select) + 1);
    expect(v.vendor_members!.select).toBe("1");
    expect([v.vendors!.update, v.vendor_prices!.update, v.vendor_prices!.delete]).toEqual(["1", "1", "1"]);
  });

  it("staff WITH MFA see at least what users see, staff tables in full, and still write nothing directly", () => {
    const u = m.user!;
    for (const role of STAFF_AAL2) {
      const s = m[role]!;
      for (const [rel, ops] of Object.entries(s)) {
        expect(count(ops.select) >= count(u[rel]!.select), `${role} ${rel} select ${ops.select} < ${u[rel]!.select}`).toBe(true);
        expect([ops.update, ops.delete], `${role} ${rel} writes`).toEqual([u[rel]!.update, u[rel]!.delete]);
      }
      for (const rel of ["activity_events", "moderation_items", "user_sanctions", "reports", "admin_tasks"]) {
        expect(s[rel]!.select, `${role} ${rel}`).toBe(m.postgres![rel]!.select);
      }
    }
  });

  it("drafts and revisions: admins see every guide and revision, moderators don't", () => {
    expect(m.admin_aal2!.guides!.select).toBe(m.postgres!.guides!.select);
    expect(m.admin_aal2!.guide_revisions!.select).toBe(m.postgres!.guide_revisions!.select);
    expect(m.moderator_aal2!.guide_revisions!.select).toBe("0");
  });
});
