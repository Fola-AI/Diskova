import { nanoid } from "nanoid";
import slugify from "slugify";
import { z } from "zod";

import { writeAudit } from "@/lib/admin-db/audit";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { parseCsv } from "@/lib/content/csv";
import { parseFrontmatter } from "@/lib/content/frontmatter";
import { parseHoursSyntax } from "@/lib/content/hours-syntax";
import { parseBlocks } from "@/lib/content/markdown";
import { DEFAULT_TIMEZONE } from "@/lib/config";
import { safeExternalUrl } from "@/lib/directory/links";
import { FEATURES } from "@/lib/directory/constants";
import { processImage } from "@/lib/media/image";
import { putPublicWebp, VENDOR_ASSETS_BUCKET } from "@/lib/media/uploads";
import { assertServerOnly } from "@/lib/server-only";
import { EVENT_CATEGORIES, GUIDE_TYPES } from "@/lib/validation/constants";
import { localToUtcIso } from "@/lib/validation/events";

assertServerOnly("lib/services/content-loader");

/**
 * /content loader (PRD L15, scripts/seed-content.ts). Two phases:
 *  1. read + validate EVERY file (zod, references to cities/areas/categories/venues) — any error and
 *     nothing is written;
 *  2. idempotent upserts with the service role, then one audit entry with the counts.
 * Never overwrites a claimed venue (its owner manages it) and never overwrites an existing guide or
 * safety entry unless `overwrite` is set.
 */
export interface ContentFile { path: string; text: string }
export interface ContentSource { files: ContentFile[]; readImage(name: string): Promise<Buffer | null> }
export interface LoadOptions { dryRun: boolean; overwrite: boolean; includeExamples?: boolean }
export interface LoadReport {
  created: Record<string, number>;
  updated: Record<string, number>;
  skipped: Record<string, number>;
  errors: string[];
  warnings: string[];
}

const slug = (s: string) => slugify(s, { lower: true, strict: true, trim: true }).slice(0, 80).replace(/-+$/, "");
const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const handle = z.string().trim().max(60).transform((v) => v.replace(/^@/, "") || null);
const url = z.string().trim().max(500).transform((v, ctx) => {
  if (!v) return null;
  const safe = safeExternalUrl(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  if (!safe) ctx.addIssue({ code: "custom", message: `not a valid link: ${v}` });
  return safe;
});
const list = z.string().transform((v) => v.split(";").map((s) => s.trim()).filter(Boolean));

const vendorRow = z.object({
  city: z.string().trim().min(1),
  area: z.string().trim().default(""),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().default(""),
  category: z.string().trim().min(1),
  secondary_categories: list.default([]),
  price_band: z.union([z.literal(""), z.enum(["free", "budget", "mid", "premium", "luxury"])]).default("").transform((v) => v || null),
  tagline: opt(140).default(""),
  description: opt(5000).default(""),
  address: opt(200).default(""),
  lat: z.coerce.number().min(4).max(14),
  lng: z.coerce.number().min(2.5).max(15),
  phone: opt(30).default(""),
  whatsapp: opt(30).default(""),
  email: z.union([z.literal(""), z.email()]).default("").transform((v) => v || null),
  website: url.default(""),
  instagram: handle.default(""),
  tiktok: handle.default(""),
  x: handle.default(""),
  features: list.default([]),
  hours: z.string().default(""),
  dress_code: opt(200).default(""),
  age_policy: opt(200).default(""),
  parking_note: opt(300).default(""),
  status: z.union([z.literal(""), z.enum(["published", "draft"])]).default("").transform((v) => v || "published"),
  cover: z.string().trim().default(""),
});

const priceRow = z.object({ vendor: z.string().trim().min(1), label: z.string().trim().min(1).max(80), amount_ngn: z.coerce.number().int().min(0).max(100_000_000), note: opt(200).default("") });

const EVENT_VALUES = EVENT_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const eventRow = z.object({
  title: z.string().trim().min(3).max(140),
  slug: z.string().trim().default(""),
  category: z.enum(EVENT_VALUES),
  starts: z.string().trim().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, "use YYYY-MM-DD HH:MM (venue time)"),
  ends: z.union([z.literal(""), z.string().trim().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)]).default(""),
  venue: z.string().trim().default(""),
  venue_name: z.string().trim().max(140).default(""),
  area: z.string().trim().default(""),
  ticket_url: url.default(""),
  is_free: z.string().trim().default("").transform((v) => /^(yes|true|1)$/i.test(v)),
  price_from_ngn: z.union([z.literal(""), z.coerce.number().int().min(0)]).default("").transform((v) => (v === "" ? null : v)),
  price_to_ngn: z.union([z.literal(""), z.coerce.number().int().min(0)]).default("").transform((v) => (v === "" ? null : v)),
  description: opt(20000).default(""),
  status: z.union([z.literal(""), z.enum(["published", "draft"])]).default("").transform((v) => v || "published"),
});

const GUIDE_VALUES = GUIDE_TYPES.map((g) => g.value) as [string, ...string[]];
const guideFront = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().trim().optional(),
  type: z.enum(GUIDE_VALUES).optional(),
  excerpt: z.string().trim().max(300).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional().transform((v) => (Array.isArray(v) ? v : v ? [v] : []).map((t) => slug(t)).filter(Boolean).slice(0, 12)),
  status: z.enum(["draft", "review", "published"]).default("draft"),
  seo_title: z.string().trim().max(70).optional(),
  seo_description: z.string().trim().max(170).optional(),
  cover: z.string().trim().optional(),
});

const SAFETY_SECTIONS = ["emergency_numbers", "hospitals", "police_stations", "embassies", "travel_advice", "area_notes", "scam_awareness"] as const;

type Ref = { cities: Map<string, { id: string; timezone: string }>; areas: Map<string, string>; categories: Map<string, string>; vendors: Map<string, { id: string; claimed: boolean; city_id: string; lat: number | null; lng: number | null }> };

interface Planned {
  vendors: Array<{ where: string; row: z.output<typeof vendorRow>; slug: string; hours: ReturnType<typeof parseHoursSyntax> }>;
  prices: Array<{ where: string; row: z.output<typeof priceRow> }>;
  events: Array<{ where: string; row: z.output<typeof eventRow>; city: string; slug: string }>;
  guides: Array<{ where: string; type: string; city: string | null; front: z.output<typeof guideFront>; body: string; slug: string }>;
  safety: Array<{ where: string; city: string | null; section: (typeof SAFETY_SECTIONS)[number]; title: string; body: string; order: number; verified_on: string | null }>;
}

function bump(m: Record<string, number>, k: string, n = 1) {
  m[k] = (m[k] ?? 0) + n;
}

async function loadRefs(): Promise<Ref> {
  const admin = getAdminSupabase();
  const [cities, areas, categories, vendors] = await Promise.all([
    admin.from("cities").select("id, slug, timezone"),
    admin.from("areas").select("id, slug, city:cities(slug)"),
    admin.from("categories").select("id, slug"),
    admin.from("vendors").select("id, slug, claim_status, owner_profile_id, city_id, lat, lng").is("deleted_at", null).limit(20000),
  ]);
  return {
    cities: new Map((cities.data ?? []).map((c) => [c.slug, { id: c.id, timezone: c.timezone }])),
    areas: new Map((areas.data ?? []).map((a) => [`${(a.city as unknown as { slug: string } | null)?.slug}/${a.slug}`, a.id])),
    categories: new Map((categories.data ?? []).map((c) => [c.slug, c.id])),
    vendors: new Map((vendors.data ?? []).map((v) => [v.slug, { id: v.id, claimed: v.claim_status === "claimed" || Boolean(v.owner_profile_id), city_id: v.city_id, lat: v.lat, lng: v.lng }])),
  };
}

function issues(err: unknown): string {
  return err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join(".") || "row"}: ${i.message}`).join("; ") : err instanceof Error ? err.message : String(err);
}

/** Phase 1: parse + validate everything. */
function plan(src: ContentSource, refs: Ref, opts: LoadOptions, report: LoadReport): Planned {
  const p: Planned = { vendors: [], prices: [], events: [], guides: [], safety: [] };
  const files = src.files.filter((f) => opts.includeExamples || !f.path.split("/").some((seg) => seg.startsWith("_")));
  const vendorSlugs = new Set(refs.vendors.keys());

  for (const f of files.filter((x) => /^vendors\/[^/]+\.csv$/.test(x.path))) {
    for (const { line, row } of parseCsv(f.text)) {
      const where = `${f.path}:${line}`;
      try {
        const r = vendorRow.parse(row);
        if (!refs.cities.has(r.city)) throw new Error(`unknown city "${r.city}"`);
        if (r.area && !refs.areas.has(`${r.city}/${r.area}`)) throw new Error(`unknown area "${r.area}" in ${r.city}`);
        if (!refs.categories.has(r.category)) throw new Error(`unknown category "${r.category}"`);
        for (const c of r.secondary_categories) if (!refs.categories.has(c)) throw new Error(`unknown secondary category "${c}"`);
        for (const ft of r.features) if (!FEATURES[ft]) throw new Error(`unknown feature "${ft}" (see content/README.md)`);
        const s = slug(r.slug || `${r.name} ${r.city}`);
        p.vendors.push({ where, row: r, slug: s, hours: parseHoursSyntax(r.hours) });
        vendorSlugs.add(s);
      } catch (err) {
        report.errors.push(`${where} — ${issues(err)}`);
      }
    }
  }
  for (const f of files.filter((x) => /^prices\/[^/]+\.csv$/.test(x.path))) {
    for (const { line, row } of parseCsv(f.text)) {
      const where = `${f.path}:${line}`;
      try {
        const r = priceRow.parse(row);
        if (!vendorSlugs.has(r.vendor)) throw new Error(`unknown venue slug "${r.vendor}"`);
        p.prices.push({ where, row: r });
      } catch (err) {
        report.errors.push(`${where} — ${issues(err)}`);
      }
    }
  }
  for (const f of files.filter((x) => /^events\/[^/]+\.csv$/.test(x.path))) {
    const city = f.path.split("/")[1]!.replace(/\.csv$/, "");
    if (!refs.cities.has(city)) {
      report.errors.push(`${f.path} — file name must be a city slug (unknown "${city}")`);
      continue;
    }
    for (const { line, row } of parseCsv(f.text)) {
      const where = `${f.path}:${line}`;
      try {
        const r = eventRow.parse(row);
        if (r.venue && !vendorSlugs.has(r.venue)) throw new Error(`unknown venue slug "${r.venue}"`);
        if (!r.venue && !r.venue_name) throw new Error("give venue (a venue slug) or venue_name");
        if (r.area && !refs.areas.has(`${city}/${r.area}`)) throw new Error(`unknown area "${r.area}"`);
        if (r.ends && r.ends <= r.starts) throw new Error("ends must be after starts");
        p.events.push({ where, row: r, city, slug: slug(r.slug || `${r.title} ${r.starts.slice(0, 10)}`) });
      } catch (err) {
        report.errors.push(`${where} — ${issues(err)}`);
      }
    }
  }
  const guideFiles = files.filter((x) => /^(guides\/[^/]+|toolkit|blog|safety-pages)\/[^/]+\.md$/.test(x.path));
  for (const f of guideFiles) {
    try {
      const { data, body } = parseFrontmatter(f.text);
      const front = guideFront.parse(data);
      const [dir, sub] = f.path.split("/") as [string, string];
      const type = dir === "toolkit" ? "toolkit" : dir === "blog" ? "blog" : dir === "safety-pages" ? "safety_page" : front.type ?? "city_guide";
      const city = dir === "guides" ? sub : dir === "safety-pages" ? f.path.split("/")[1]!.replace(/\.md$/, "") : null;
      if (city && city !== "nigeria" && !refs.cities.has(city)) throw new Error(`folder/file must be a city slug (unknown "${city}")`);
      if (!body.trim()) throw new Error("empty body");
      for (const b of parseBlocks(body)) {
        const refsUsed = b.type === "vendor-card" ? [b.slug] : b.type === "map" ? b.slugs : b.type === "price-table" ? [b.vendor] : [];
        for (const s of refsUsed) if (!vendorSlugs.has(s)) report.warnings.push(`${f.path} — embeds unknown venue "${s}" (it will render as "not found")`);
      }
      p.guides.push({ where: f.path, type, city: city === "nigeria" ? null : city, front, body, slug: slug(front.slug || f.path.split("/").at(-1)!.replace(/\.md$/, "")) });
    } catch (err) {
      report.errors.push(`${f.path} — ${issues(err)}`);
    }
  }
  for (const f of files.filter((x) => /^safety\/[^/]+\.md$/.test(x.path))) {
    try {
      const { data, body } = parseFrontmatter(f.text);
      const name = f.path.split("/")[1]!.replace(/\.md$/, "");
      const city = name === "national" ? null : name;
      if (city && !refs.cities.has(city)) throw new Error(`file name must be "national" or a city slug (unknown "${city}")`);
      const verified = typeof data.verified_on === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.verified_on) ? data.verified_on : null;
      const parts = body.split(/^## /m).slice(1);
      if (!parts.length) throw new Error('no entries — start each one with "## section | Title"');
      parts.forEach((part, i) => {
        const [headLine, ...rest] = part.split("\n");
        const m = /^([a-z_]+)\s*\|\s*(.+)$/.exec(headLine!.trim());
        if (!m || !SAFETY_SECTIONS.includes(m[1] as (typeof SAFETY_SECTIONS)[number])) throw new Error(`entry ${i + 1}: heading must be "## <section> | <title>" with section one of ${SAFETY_SECTIONS.join(", ")}`);
        p.safety.push({ where: f.path, city, section: m[1] as (typeof SAFETY_SECTIONS)[number], title: m[2]!.trim().slice(0, 140), body: rest.join("\n").trim(), order: (i + 1) * 10, verified_on: verified });
      });
    } catch (err) {
      report.errors.push(`${f.path} — ${issues(err)}`);
    }
  }
  const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
  for (const d of dupes(p.vendors.map((v) => v.slug))) report.errors.push(`duplicate venue slug "${d}" in vendors/*.csv`);
  for (const d of dupes(p.guides.map((g) => g.slug))) report.errors.push(`duplicate guide slug "${d}"`);
  for (const d of dupes(p.events.map((e) => e.slug))) report.errors.push(`duplicate event slug "${d}"`);
  return p;
}

async function coverFrom(src: ContentSource, name: string, folder: string, bucket: "vendor-assets" | "guides", report: LoadReport, where: string): Promise<string | null> {
  if (!name) return null;
  if (/^https?:\/\//.test(name)) {
    report.warnings.push(`${where} — remote cover URLs aren't fetched; put the file in content/images/ (skipped)`);
    return null;
  }
  const buf = await src.readImage(name);
  if (!buf) {
    report.warnings.push(`${where} — image "${name}" not found in content/images/ (skipped)`);
    return null;
  }
  const img = await processImage(buf); // one image at a time: strip EXIF, ≤ 2000 px, WebP
  const path = `${folder}/${nanoid(12)}.webp`;
  if (bucket === "vendor-assets") return putPublicWebp(path, img.data, VENDOR_ASSETS_BUCKET);
  const storage = getAdminSupabase().storage.from("guides");
  const { error } = await storage.upload(path, img.data, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw new Error(`upload failed for ${name}`);
  return storage.getPublicUrl(path).data.publicUrl;
}

export async function loadContent(src: ContentSource, opts: LoadOptions): Promise<LoadReport> {
  const report: LoadReport = { created: {}, updated: {}, skipped: {}, errors: [], warnings: [] };
  const refs = await loadRefs();
  const p = plan(src, refs, opts, report);
  if (report.errors.length || opts.dryRun) {
    if (opts.dryRun && !report.errors.length) {
      bump(report.created, "vendors (planned)", p.vendors.length);
      bump(report.created, "prices (planned)", p.prices.length);
      bump(report.created, "events (planned)", p.events.length);
      bump(report.created, "guides (planned)", p.guides.length);
      bump(report.created, "safety entries (planned)", p.safety.length);
    }
    return report;
  }
  const admin = getAdminSupabase();

  // Venues
  for (const v of p.vendors) {
    const r = v.row;
    const existing = refs.vendors.get(v.slug);
    if (existing?.claimed) {
      bump(report.skipped, "vendors (claimed — owner manages it)");
      continue;
    }
    const row = {
      slug: v.slug, name: r.name, tagline: r.tagline, description_md: r.description, city_id: refs.cities.get(r.city)!.id,
      area_id: r.area ? refs.areas.get(`${r.city}/${r.area}`)! : null, category_id: refs.categories.get(r.category)!,
      secondary_category_ids: r.secondary_categories.map((c) => refs.categories.get(c)!), price_band: r.price_band, address_line: r.address,
      location: `SRID=4326;POINT(${r.lng} ${r.lat})`, phone: r.phone, whatsapp: r.whatsapp, email: r.email, website_url: r.website,
      instagram_handle: r.instagram, tiktok_handle: r.tiktok, x_handle: r.x, features: r.features, opening_hours: v.hours,
      dress_code: r.dress_code, age_policy: r.age_policy, parking_note: r.parking_note, status: r.status as "published" | "draft", is_seed: false,
    };
    if (existing) {
      const { error } = await admin.from("vendors").update(row).eq("id", existing.id);
      if (error) report.errors.push(`${v.where} — ${error.message}`);
      else bump(report.updated, "vendors");
    } else {
      const { data, error } = await admin.from("vendors").insert(row).select("id").single();
      if (error || !data) {
        report.errors.push(`${v.where} — ${error?.message}`);
        continue;
      }
      refs.vendors.set(v.slug, { id: data.id, claimed: false, city_id: row.city_id, lat: r.lat, lng: r.lng });
      bump(report.created, "vendors");
    }
    const id = refs.vendors.get(v.slug)!.id;
    const cover = await coverFrom(src, r.cover, id + "/cover", "vendor-assets", report, v.where);
    if (cover) await admin.from("vendors").update({ cover_image_url: cover }).eq("id", id);
  }

  // Prices: each listed venue's price list is replaced by the file's rows (unclaimed venues only).
  const byVendor = new Map<string, typeof p.prices>();
  for (const pr of p.prices) byVendor.set(pr.row.vendor, [...(byVendor.get(pr.row.vendor) ?? []), pr]);
  for (const [vSlug, rows] of byVendor) {
    const v = refs.vendors.get(vSlug)!;
    if (v.claimed) {
      bump(report.skipped, "price lists (claimed venue)");
      continue;
    }
    await admin.from("vendor_prices").delete().eq("vendor_id", v.id);
    const { error } = await admin.from("vendor_prices").insert(rows.map((r) => ({ vendor_id: v.id, label: r.row.label, amount_ngn: r.row.amount_ngn, note: r.row.note })));
    if (error) report.errors.push(`${rows[0]!.where} — ${error.message}`);
    else bump(report.created, "prices", rows.length);
  }

  // Events
  const { data: existingEvents } = await admin.from("events").select("id, slug").in("slug", p.events.map((e) => e.slug).concat(["-"]));
  const eventIds = new Map((existingEvents ?? []).map((e) => [e.slug, e.id]));
  for (const e of p.events) {
    const r = e.row;
    const city = refs.cities.get(e.city)!;
    const venue = r.venue ? refs.vendors.get(r.venue) : null;
    const row = {
      slug: e.slug, title: r.title, category: r.category as (typeof EVENT_VALUES)[number] as never, city_id: city.id, timezone: city.timezone ?? DEFAULT_TIMEZONE,
      area_id: r.area ? refs.areas.get(`${e.city}/${r.area}`)! : null, venue_vendor_id: venue?.id ?? null, venue_name_freeform: r.venue_name || null,
      location: venue && venue.lat !== null && venue.lng !== null ? `SRID=4326;POINT(${venue.lng} ${venue.lat})` : null,
      starts_at: localToUtcIso(r.starts.replace(" ", "T"), city.timezone), ends_at: r.ends ? localToUtcIso(r.ends.replace(" ", "T"), city.timezone) : null,
      ticket_url: r.ticket_url, is_free: r.is_free, price_from_ngn: r.price_from_ngn, price_to_ngn: r.price_to_ngn, description_md: r.description,
      status: r.status as "published" | "draft", approved_at: r.status === "published" ? new Date().toISOString() : null,
    };
    const id = eventIds.get(e.slug);
    const { error } = id ? await admin.from("events").update(row).eq("id", id) : await admin.from("events").insert(row);
    if (error) report.errors.push(`${e.where} — ${error.message}`);
    else bump(id ? report.updated : report.created, "events");
  }

  // Guides / toolkit / blog / safety pages
  const { data: existingGuides } = await admin.from("guides").select("id, slug, published_at").in("slug", p.guides.map((g) => g.slug).concat(["-"]));
  const guideIds = new Map((existingGuides ?? []).map((g) => [g.slug, g]));
  for (const g of p.guides) {
    const existing = guideIds.get(g.slug);
    if (existing && !opts.overwrite) {
      bump(report.skipped, "guides (exist — use --overwrite)");
      continue;
    }
    const cover = g.front.cover ? await coverFrom(src, g.front.cover, "covers", "guides", report, g.where) : undefined;
    const row = {
      slug: g.slug, type: g.type as never, title: g.front.title, excerpt: g.front.excerpt ?? null, body_md: g.body, tags: g.front.tags,
      city_id: g.city ? refs.cities.get(g.city)!.id : null, status: g.front.status as never, seo_title: g.front.seo_title ?? null,
      seo_description: g.front.seo_description ?? null, published_at: g.front.status === "published" ? existing?.published_at ?? new Date().toISOString() : null,
      ...(cover ? { cover_image_url: cover } : {}),
    };
    const { error } = existing ? await admin.from("guides").update(row).eq("id", existing.id) : await admin.from("guides").insert(row);
    if (error) report.errors.push(`${g.where} — ${error.message}`);
    else bump(existing ? report.updated : report.created, "guides");
  }

  // Safety info
  for (const s of p.safety) {
    const cityId = s.city ? refs.cities.get(s.city)!.id : null;
    let q = admin.from("safety_info").select("id").eq("section", s.section).eq("title", s.title);
    q = cityId ? q.eq("city_id", cityId) : q.is("city_id", null);
    const { data: hit } = await q.maybeSingle();
    if (hit && !opts.overwrite) {
      bump(report.skipped, "safety entries (exist — use --overwrite)");
      continue;
    }
    const row = { city_id: cityId, section: s.section, title: s.title, body_md: s.body, sort_order: s.order, last_verified_at: s.verified_on ? `${s.verified_on}T12:00:00+01:00` : null };
    const { error } = hit ? await admin.from("safety_info").update(row).eq("id", hit.id) : await admin.from("safety_info").insert(row);
    if (error) report.errors.push(`${s.where} — ${error.message}`);
    else bump(hit ? report.updated : report.created, "safety entries");
  }

  await writeAudit({ action: "content.loaded", entityType: "content", entityId: null, after: { created: report.created, updated: report.updated, skipped: report.skipped, errors: report.errors.length }, actorRole: "system", reason: "scripts/seed-content.ts" });
  return report;
}
