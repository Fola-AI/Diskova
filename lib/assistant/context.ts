import { getPublicSupabase } from "@/lib/db/public";
import { getCityBySlug, listAreas, listCategories, listCities, searchDirectory, type CityRow } from "@/lib/db/directory";
import { listEvents } from "@/lib/db/events";
import { getCityLive } from "@/lib/db/live";
import { crowdLabel } from "@/lib/directory/crowd";
import { priceBandSymbol, type PriceBand } from "@/lib/directory/constants";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/assistant/context");

export interface AssistantContext {
  city: CityRow;
  /** slug → display name: the only venues the assistant may name (and the UI may link). */
  offered: Record<string, string>;
  text: string;
}

const MAX_VENUES = 25;

/** Question words → category slugs (simple intent detection for retrieval). */
const CATEGORY_WORDS: Array<[RegExp, string[]]> = [
  [/\b(club|clubs|clubbing|nightclub|party|parties|dance|dancing|rave)\b/i, ["nightclub"]],
  [/\b(rooftop|rooftops|view|views|sunset|sundowner)s?\b/i, ["rooftop"]],
  [/\b(bar|bars|drinks?|cocktails?|beer|pub)\b/i, ["bar", "lounge", "rooftop", "hotel_bar"]],
  [/\b(lounge|lounges|chill|shisha)\b/i, ["lounge"]],
  [/\b(eat|eating|food|dinner|lunch|restaurant|restaurants|brunch|jollof)\b/i, ["restaurant"]],
  [/\b(suya|street food|bole|boli|amala|pepper ?soup|nkwobi)\b/i, ["street_food"]],
  [/\b(cafe|caf\u00e9|coffee|work|laptop|wifi)\b/i, ["cafe"]],
  [/\b(beach|beaches|sea|ocean|swim)\b/i, ["beach", "resort"]],
  [/\b(resort|pool|day pass)\b/i, ["resort"]],
  [/\b(cinema|movie|movies|film)\b/i, ["cinema"]],
  [/\b(art|gallery|galleries|exhibition)\b/i, ["art_gallery", "museum"]],
  [/\b(museum|history|historic|culture)\b/i, ["museum", "historic_site"]],
  [/\b(market|markets|shopping|souvenir)\b/i, ["market"]],
  [/\b(nature|park|hike|outdoors)\b/i, ["nature", "amusement_park"]],
  [/\b(live music|concert|gig|band|afrobeats?)\b/i, ["concert_venue", "nightclub", "lounge"]],
];
const STOPWORDS = new Set("what where when which who how much many with that this there their them they then than tonight today now right busy best good nice open near around about from have does into your some any lagos abuja ibadan owerri port harcourt place places spot spots go going want looking cost costs price prices".split(" "));

/** Pick the city: explicit slug, else one named in the question, else the default. */
export async function resolveCity(citySlug: string | undefined, question: string): Promise<CityRow | null> {
  const cities = await listCities();
  const named = cities.find((c) => new RegExp(`\\b${c.name.replace(/[^a-z ]/gi, "")}\\b`, "i").test(question));
  return (named && named.slug !== citySlug ? named : null) ?? (citySlug ? await getCityBySlug(citySlug) : null) ?? cities[0] ?? null;
}

/**
 * PRD P5 context: the city, a live summary (crowd now), full-text top 15 for the question, and this
 * week's events. Venues named by area in the question ("busy in Lekki") come first.
 */
export async function buildContext(city: CityRow, question: string, now = new Date()): Promise<AssistantContext> {
  const keywords = [...new Set(question.toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOPWORDS.has(w)))].slice(0, 4);
  const [areas, categories, live, hitLists, events] = await Promise.all([
    listAreas(city.id),
    listCategories(),
    getCityLive(city.id),
    Promise.all(keywords.map((k) => searchDirectory(k, city.id, 8).catch(() => []))),
    listEvents({ cityId: city.id, from: now, to: new Date(now.getTime() + 7 * 86_400_000), limit: 6 }).catch(() => []),
  ]);
  const hits = hitLists.flat().sort((a, b) => b.score - a.score).slice(0, 15);
  const wantedCats = [...new Set(CATEGORY_WORDS.flatMap(([re, slugs]) => (re.test(question) ? slugs : [])))];
  const wantedCatIds = categories.filter((c) => wantedCats.includes(c.slug)).map((c) => c.id);
  const areaName = new Map(areas.map((a) => [a.id, a.name]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const words = question.toLowerCase();
  const mentionedAreas = new Set(areas.filter((a) => a.name.toLowerCase().split(/[\s-]+/).filter((w) => w.length > 2 && !["phase", "island"].includes(w)).some((w) => words.includes(w))).map((a) => a.id));

  // Live venues, mentioned areas first, busiest first.
  const liveSorted = [...live].sort((a, b) => Number(mentionedAreas.has(b.area_id ?? "")) - Number(mentionedAreas.has(a.area_id ?? "")) || b.weight - a.weight);
  const liveBySlug = new Map(live.map((l) => [l.slug, l]));

  // Non-live venues: full-text hits + anything in a mentioned area.
  const hitSlugs = hits.filter((h) => h.kind === "vendor").map((h) => h.slug);
  const filters = [`slug.in.(${["x-none", ...hitSlugs].join(",")})`];
  if (mentionedAreas.size) filters.push(`area_id.in.(${[...mentionedAreas].join(",")})`);
  if (wantedCatIds.length) filters.push(`category_id.in.(${wantedCatIds.join(",")})`);
  const vendorCols = "id, slug, name, tagline, price_band, category_id, area_id, verified, last_activity_at";
  const base = () => getPublicSupabase().from("vendors").select(vendorCols).eq("city_id", city.id).eq("status", "published").is("deleted_at", null);
  const [{ data: matched }, { data: popular }] = await Promise.all([
    base().or(filters.join(",")).order("verified", { ascending: false }).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(40),
    // Fallback so a vague question still gets real options: the city's most active listings.
    base().order("verified", { ascending: false }).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(10),
  ]);
  const others = [...(matched ?? []), ...(popular ?? []).filter((p) => !(matched ?? []).some((m) => m.slug === p.slug))];

  type V = { slug: string; name: string; tagline: string | null; price_band: string | null; category_id: string; area_id: string | null };
  const chosen: V[] = [];
  const seen = new Set<string>();
  const add = (v: V) => {
    if (seen.has(v.slug) || chosen.length >= MAX_VENUES) return;
    seen.add(v.slug);
    chosen.push(v);
  };
  liveSorted.slice(0, 15).forEach(add);
  const inArea = (o: V) => !mentionedAreas.size || mentionedAreas.has(o.area_id ?? "");
  const inCat = (o: V) => wantedCatIds.includes(o.category_id);
  for (const s of hitSlugs) {
    const v = others.find((o) => o.slug === s);
    if (v) add(v);
  }
  others.filter((o) => inArea(o) && inCat(o)).forEach(add);
  others.filter((o) => inArea(o) && !wantedCatIds.length).forEach(add);
  others.filter((o) => inCat(o)).forEach(add);
  if (chosen.length < 8) others.forEach(add);

  const ids = others.filter((o) => seen.has(o.slug)).map((o) => o.id).concat(live.filter((l) => seen.has(l.slug)).map((l) => l.vendor_id));
  const { data: prices } = ids.length ? await getPublicSupabase().from("vendor_prices").select("vendor_id, label, amount_ngn").in("vendor_id", ids).eq("is_active", true).order("amount_ngn") : { data: [] };
  const idBySlug = new Map([...others.map((o) => [o.slug, o.id] as const), ...live.map((l) => [l.slug, l.vendor_id] as const)]);

  const lines = chosen.map((v) => {
    const l = liveBySlug.get(v.slug);
    const vp = (prices ?? []).filter((p) => p.vendor_id === idBySlug.get(v.slug)).slice(0, 3);
    const parts = [
      `[[${v.slug}]] ${v.name}`,
      [catName.get(v.category_id), v.area_id ? areaName.get(v.area_id) : null].filter(Boolean).join(", "),
      l ? `LIVE NOW: ${crowdLabel(l.crowd_level_avg)} (confidence ${l.confidence}, ${l.post_count} recent posts${l.official_count ? `, ${l.official_count} official updates` : ""})` : "no live reports right now",
      v.price_band ? `price band ${priceBandSymbol(v.price_band as PriceBand)}` : null,
      vp.length ? `listed prices: ${vp.map((p) => `${p.label} ₦${p.amount_ngn.toLocaleString("en-NG")}`).join("; ")}` : null,
      v.tagline,
    ];
    return `- ${parts.filter(Boolean).join(" · ")}`;
  });
  const eventLines = events.map((e) => `- ${e.title} — ${new Date(e.starts_at).toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: city.timezone })}${e.venue?.name ? ` at ${e.venue.name}` : e.venue_name_freeform ? ` at ${e.venue_name_freeform}` : ""} (link: /events/${e.slug})`);

  const text = [
    `City: ${city.name}. Local time: ${now.toLocaleString("en-NG", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: city.timezone })}.`,
    mentionedAreas.size ? `Areas mentioned in the question: ${[...mentionedAreas].map((id) => areaName.get(id)).join(", ")}.` : "",
    `VENUES (the only venues you may name; refer to them ONLY with their [[slug]] token):`,
    lines.length ? lines.join("\n") : "- (no matching venues)",
    events.length ? `EVENTS THIS WEEK:\n${eventLines.join("\n")}` : "EVENTS THIS WEEK: none listed.",
  ].filter(Boolean).join("\n");

  return { city, offered: Object.fromEntries(chosen.map((v) => [v.slug, v.name])), text };
}
