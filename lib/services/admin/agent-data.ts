import { z } from "zod";

import { getAdminSupabase } from "@/lib/admin-db/client";
import { getCityBySlug, listCities } from "@/lib/db/directory";
import { getCityLive } from "@/lib/db/live";
import { Constants } from "@/lib/db/types";
import { assertServerOnly } from "@/lib/server-only";
import { getDashboard } from "@/lib/services/admin/dashboard";
import { listModerationQueue } from "@/lib/services/admin/moderation";
import { listReportsAdmin } from "@/lib/services/admin/reports";
import { listTasks } from "@/lib/services/admin/tasks";
import { getVendorAdminDetail, listVendorsTable } from "@/lib/services/admin/vendors";

assertServerOnly("lib/services/admin/agent-data");

/** Agent API reads (§12). Thin layer over the admin services; PII only when the key has pii:read. */
const E = Constants.public.Enums;
const uuid = z.uuid();
const bool = (v: string | null) => (v === "true" || v === "1" ? true : v === "false" || v === "0" ? false : undefined);
const num = (v: string | null, def: number, max: number) => Math.min(max, Math.max(1, Number(v) || def));
const pickEnum = <T extends string>(v: string | null, all: readonly T[], what: string): T | undefined => {
  if (v === null || v === "") return undefined;
  if (!all.includes(v as T)) throw new z.ZodError([{ code: "custom", path: [what], message: `must be one of ${all.join(", ")}`, input: v }]);
  return v as T;
};

async function cityIdOf(slug: string | null): Promise<string | undefined> {
  if (!slug) return undefined;
  const city = await getCityBySlug(slug);
  if (!city) throw new z.ZodError([{ code: "custom", path: ["city"], message: `unknown city "${slug}"`, input: slug }]);
  return city.id;
}

export async function agentSummary() {
  const d = await getDashboard();
  return { kpis: d.summary, moderation: d.moderation, daily: d.series, pending_vendors: d.pendingVendors, pending_events: d.pendingEvents, open_tasks: d.tasks, safety_entries_never_verified: d.unverifiedSafety };
}

export async function agentActivity(sp: URLSearchParams) {
  const vendorId = sp.get("vendor_id") ? uuid.parse(sp.get("vendor_id")) : undefined;
  const userId = sp.get("user_id") ? uuid.parse(sp.get("user_id")) : undefined;
  const kind = sp.get("kind") ? z.string().regex(/^[a-z_.]{2,40}$/).parse(sp.get("kind")) : undefined;
  const { data, error } = await getAdminSupabase().rpc("admin_list_activity", { p_kind_prefix: kind, p_city_id: await cityIdOf(sp.get("city")), p_vendor_id: vendorId, p_profile_id: userId, p_limit: num(sp.get("limit"), 50, 200) });
  if (error) throw error;
  return data ?? [];
}

export async function agentLive(sp: URLSearchParams) {
  const slug = sp.get("city");
  const cities = slug ? [await getCityBySlug(slug)].filter(Boolean) : await listCities();
  if (slug && !cities.length) await cityIdOf(slug);
  const out = await Promise.all(cities.map(async (c) => ({ city: c!.slug, venues: (await getCityLive(c!.id)).map(({ photo_placeholder: _p, ...v }) => v) })));
  return out;
}

export async function agentVendors(sp: URLSearchParams) {
  const sorts = ["name", "city", "status", "completeness", "posts_7d", "official_updates_7d", "open_reports", "last_activity_at", "created_at"] as const;
  const r = await listVendorsTable({
    q: sp.get("q")?.slice(0, 80) || undefined,
    status: pickEnum(sp.get("status"), E.vendor_status, "status"),
    cityId: await cityIdOf(sp.get("city")),
    verified: bool(sp.get("verified")),
    claim: pickEnum(sp.get("claim"), E.claim_status, "claim"),
    noPrices: bool(sp.get("no_prices")) ?? false,
    noPhotos: bool(sp.get("no_photos")) ?? false,
    neverPosted: bool(sp.get("never_posted")) ?? false,
    sort: pickEnum(sp.get("sort"), sorts, "sort") ?? "created_at",
    desc: sp.get("dir") !== "asc",
    limit: num(sp.get("limit"), 50, 200),
    offset: Math.max(0, Number(sp.get("offset")) || 0),
  });
  return { total: r.total, vendors: r.rows.map(({ total: _t, ...v }) => v) };
}

export async function agentVendor(id: string) {
  const d = await getVendorAdminDetail(uuid.parse(id));
  if (!d) return null;
  // Verification documents are never exposed to agents — only whether they were supplied.
  const verification = d.verification.map((r) => ({ id: r.id, is_claim: r.is_claim, status: r.status, submitted_by: r.submitter_username, created_at: r.created_at, has_business_doc: Boolean(r.business_doc_path), has_id_doc: Boolean(r.id_doc_path), social_proof_url: r.social_proof_url }));
  return { ...d, verification };
}

export async function agentModerationQueue(sp: URLSearchParams) {
  const items = await listModerationQueue({ source: pickEnum(sp.get("source"), E.moderation_source, "source"), limit: num(sp.get("limit"), 50, 100) });
  return items.map((i) => ({ ...i, post: i.post ? { ...i.post, author: i.post.author ? { id: i.post.author.id, username: i.post.author.username, trust_score: i.post.author.trust_score, created_at: i.post.author.created_at, status: i.post.author.status, post_count: i.post.author.post_count, is_shadowbanned: i.post.author.is_shadowbanned } : null } : null }));
}

export async function agentModerationStats() {
  const { data } = await getAdminSupabase().rpc("admin_moderation_stats");
  return data;
}

export async function agentReports(sp: URLSearchParams) {
  const status = sp.get("status") === "all" ? undefined : pickEnum(sp.get("status"), E.report_status, "status") ?? "open";
  return listReportsAdmin({ status, entity: pickEnum(sp.get("entity"), E.report_entity, "entity"), offset: Math.max(0, Number(sp.get("offset")) || 0) });
}

export async function agentIssues(sp: URLSearchParams) {
  const { data, error } = await getAdminSupabase().rpc("admin_list_issue_reports", { p_status: pickEnum(sp.get("status"), E.issue_status, "status"), p_limit: num(sp.get("limit"), 100, 500) });
  if (error) throw error;
  return data ?? [];
}

export async function agentUser(id: string, includePii: boolean) {
  const admin = getAdminSupabase();
  const pid = uuid.parse(id);
  const [{ data: profile }, { data: sanctions }, { data: posts }, { data: timeline }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, role, status, status_reason, trust_score, points, badges, post_count, is_shadowbanned, created_at, last_seen_at, deleted_at").eq("id", pid).maybeSingle(),
    admin.from("user_sanctions").select("id, kind, reason, issued_at, expires_at, lifted_at").eq("profile_id", pid).order("issued_at", { ascending: false }),
    admin.from("posts").select("id, kind, status, body, created_at, vendor:vendors(slug, name)").eq("author_id", pid).order("created_at", { ascending: false }).limit(20),
    admin.rpc("admin_list_audit", { p_entity_id: pid, p_limit: 50 }),
  ]);
  if (!profile) return null;
  const base = { profile, sanctions: sanctions ?? [], recent_posts: posts ?? [], timeline: (timeline ?? []).map(({ ip: _ip, user_agent: _ua, ...a }) => a) };
  if (!includePii) return { ...base, pii: "omitted (key lacks pii:read)" };
  const [{ data: auth }, { data: network }] = await Promise.all([admin.auth.admin.getUserById(pid), admin.rpc("admin_user_network", { p_profile_id: pid })]);
  return { ...base, email: auth.user?.email ?? null, network_informational: network?.[0] ?? null };
}

export async function agentEvents(sp: URLSearchParams) {
  const status = pickEnum(sp.get("status"), E.event_status, "status");
  let q = getAdminSupabase().from("events").select("id, slug, title, status, category, starts_at, ends_at, is_featured, is_december_season, venue_name_freeform, city:cities(slug, name), submitter:profiles!events_submitted_by_fkey(username)");
  const cityId = await cityIdOf(sp.get("city"));
  if (cityId) q = q.eq("city_id", cityId);
  q = status ? q.eq("status", status) : q.or(`status.eq.pending_review,and(status.eq.published,starts_at.gte.${new Date(Date.now() - 86_400_000).toISOString()})`);
  const { data, error } = await q.order("starts_at").limit(num(sp.get("limit"), 100, 200));
  if (error) throw error;
  return data ?? [];
}

export async function agentContent(sp: URLSearchParams) {
  let q = getAdminSupabase().from("guides").select("id, type, slug, title, status, excerpt, tags, published_at, updated_at, city:cities(slug, name)").is("deleted_at", null);
  const status = pickEnum(sp.get("status"), E.guide_status, "status");
  const type = pickEnum(sp.get("type"), E.guide_type, "type");
  if (status) q = q.eq("status", status);
  if (type) q = q.eq("type", type);
  const { data, error } = await q.order("updated_at", { ascending: false }).limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function agentTasks() {
  return listTasks();
}

export async function agentSearch(sp: URLSearchParams, includePii: boolean) {
  const q = z.string().trim().min(2).max(80).parse(sp.get("q") ?? "");
  const like = `%${q.replace(/[%_\\]/g, "")}%`;
  const admin = getAdminSupabase();
  const [vendors, users, events, content] = await Promise.all([
    listVendorsTable({ q, limit: 10 }).then((r) => r.rows.map((v) => ({ id: v.id, slug: v.slug, name: v.name, city: v.city, status: v.status }))),
    admin.rpc("admin_list_users", { p_q: q, p_include_email: includePii, p_include_ip: false, p_limit: 10, p_offset: 0 }).then((r) => (r.data ?? []).map((u) => ({ id: u.id, username: u.username, display_name: u.display_name, role: u.role, status: u.status, ...(includePii ? { email: u.email } : {}) }))),
    admin.from("events").select("id, slug, title, status, starts_at").ilike("title", like).limit(10).then((r) => r.data ?? []),
    admin.from("guides").select("id, slug, type, title, status").ilike("title", like).limit(10).then((r) => r.data ?? []),
  ]);
  return { vendors, users, events, content };
}
