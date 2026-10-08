/** Stage L15 · /content loader: validates first, loads idempotently, never touches claimed venues. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { loadContent, type ContentFile, type ContentSource } from "@/lib/services/content-loader";

import { hasDevEnv, serviceClient } from "./helpers";

const d = hasDevEnv ? describe : describe.skip;
const DIR = "content/_examples";

function source(extra: ContentFile[] = []): ContentSource {
  const files: ContentFile[] = [];
  const walk = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) n !== "images" && walk(f);
      else if (/\.(md|csv)$/.test(n)) files.push({ path: relative(DIR, f).split(sep).join("/"), text: readFileSync(f, "utf8") });
    }
  };
  walk(DIR);
  return { files: [...files, ...extra], readImage: async (name) => (name === "example-cover.png" ? readFileSync(join(DIR, "images", name)) : null) };
}

const VENDORS = ["example-rooftop-lounge-lagos", "example-cafe-lagos"];
const GUIDES = ["example-first-weekend", "example-money-and-cards", "example-launch-post"];

async function cleanupExamples() {
  const svc = serviceClient();
  const { data: vs } = await svc.from("vendors").select("id").in("slug", VENDORS);
  for (const v of vs ?? []) {
    const { data: files } = await svc.storage.from("vendor-assets").list(`${v.id}/cover`);
    if (files?.length) await svc.storage.from("vendor-assets").remove(files.map((f) => `${v.id}/cover/${f.name}`));
  }
  await svc.from("events").delete().like("slug", "example-%");
  await svc.from("vendors").delete().in("slug", VENDORS);
  await svc.from("guides").delete().in("slug", GUIDES);
  await svc.from("safety_info").delete().like("title", "%(EXAMPLE%");
}

d("L15 · content loader", () => {
  afterAll(cleanupExamples);

  it("a single bad row stops the whole load (nothing written) and names file:line", async () => {
    await cleanupExamples();
    const bad = { path: "vendors/bad.csv", text: "city,name,category,lat,lng\nlagos,Bad Place,not_a_category,6.4,3.4\natlantis,Nowhere,bar,6.4,3.4\n" };
    const report = await loadContent(source([bad]), { dryRun: false, overwrite: false, includeExamples: true });
    expect(report.errors).toEqual([
      expect.stringMatching(/^vendors\/bad\.csv:2 — unknown category "not_a_category"/),
      expect.stringMatching(/^vendors\/bad\.csv:3 — unknown city "atlantis"/),
    ]);
    const { count } = await serviceClient().from("vendors").select("id", { count: "exact", head: true }).in("slug", VENDORS);
    expect(count).toBe(0);
  });

  it("loads venues (hours, features, cover image), prices, events, guides and verified safety entries — audited", async () => {
    const report = await loadContent(source(), { dryRun: false, overwrite: false, includeExamples: true });
    expect(report.errors).toEqual([]);
    expect(report.created).toMatchObject({ vendors: 2, prices: 3, events: 2, guides: 3, "safety entries": 2 });
    const svc = serviceClient();
    const { data: v } = await svc.from("vendors").select("status, opening_hours, features, cover_image_url, is_seed, instagram_handle").eq("slug", VENDORS[0]!).single();
    expect(v).toMatchObject({ status: "draft", is_seed: false, instagram_handle: "example", features: ["dj", "rooftop", "card_payments"] });
    expect(v!.opening_hours).toMatchObject({ fri: [["16:00", "03:00"]], mon: [["16:00", "01:00"]] });
    expect(v!.cover_image_url).toMatch(/vendor-assets\/.+\.webp$/);
    const { data: ev } = await svc.from("events").select("starts_at, is_december_season, venue_vendor_id").eq("slug", "example-rooftop-sessions-2026-12-20").single();
    expect(ev!.starts_at).toBe("2026-12-20T20:00:00+00:00"); // 21:00 Lagos time
    expect(ev!.venue_vendor_id).toBeTruthy();
    const { data: s } = await svc.from("safety_info").select("last_verified_at").like("title", "%(EXAMPLE, NOT REAL)%").single();
    expect(s!.last_verified_at).toMatch(/^2026-10-01/);
    const { data: audit } = await svc.rpc("admin_list_audit", { p_action_prefix: "content.loaded", p_limit: 1 });
    expect(audit?.[0]?.after).toMatchObject({ errors: 0 });
  });

  it("re-running is idempotent: venues/events update, guides and safety are skipped without --overwrite", async () => {
    const report = await loadContent(source(), { dryRun: false, overwrite: false, includeExamples: true });
    expect(report.errors).toEqual([]);
    expect(report.created.vendors ?? 0).toBe(0);
    expect(report.updated).toMatchObject({ vendors: 2, events: 2 });
    expect(report.skipped).toMatchObject({ "guides (exist — use --overwrite)": 3, "safety entries (exist — use --overwrite)": 2 });
    const { count } = await serviceClient().from("vendors").select("id", { count: "exact", head: true }).in("slug", VENDORS);
    expect(count).toBe(2);
  });

  it("claimed venues are never overwritten", async () => {
    const svc = serviceClient();
    await svc.from("vendors").update({ claim_status: "claimed", tagline: "Owner's own words" }).eq("slug", VENDORS[0]!);
    const report = await loadContent(source(), { dryRun: false, overwrite: false, includeExamples: true });
    expect(report.skipped["vendors (claimed — owner manages it)"]).toBe(1);
    const { data } = await svc.from("vendors").select("tagline").eq("slug", VENDORS[0]!).single();
    expect(data!.tagline).toBe("Owner's own words");
  });
});
