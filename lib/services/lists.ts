import { z } from "zod";

import type { SessionContext } from "@/lib/auth/guards";
import { getAdminSupabase } from "@/lib/admin-db/client";
import { getPlatformSettings, moderationSettings } from "@/lib/admin-db/settings";
import { getPublicSupabase } from "@/lib/db/public";
import { maxScore, moderateText } from "@/lib/moderation/text";
import { rateLimit, retryAfterText } from "@/lib/ratelimit";
import { assertServerOnly } from "@/lib/server-only";

assertServerOnly("lib/services/lists");

/**
 * Saved lists — "Plan my night" (PRD P2). Owner-only under RLS (the user's own client does every
 * write); public share pages read through get_shared_list(token). Titles and notes can become public,
 * so they pass the same text moderation as posts and are refused at the auto-block threshold.
 */
export class ListError extends Error {}

const title = z.string().trim().min(1, "Give the list a name.").max(80);
const note = z.string().trim().max(280).transform((v) => v || null);

async function assertClean(...texts: Array<string | null | undefined>): Promise<void> {
  const value = texts.filter(Boolean).join("\n");
  if (!value) return;
  const settings = await getPlatformSettings();
  const result = await moderateText(value, { blocklist: settings.blocklist_phrases });
  if (result.blocklistHit || maxScore(result) >= moderationSettings(settings).autoBlockThreshold) {
    throw new ListError("That wording isn't allowed. Please rephrase.");
  }
}

async function writeLimit(session: SessionContext): Promise<void> {
  const rl = await rateLimit("listWriteUser", session.user.id);
  if (!rl.ok) throw new ListError(`Too many changes — try again in ${retryAfterText(rl.reset)}.`);
}

function dbError(err: { message: string; code?: string } | null, fallback: string): never {
  if (err?.message?.startsWith("You can have up to") || err?.message?.startsWith("A list can hold")) throw new ListError(err.message);
  if (err?.code === "23505") throw new ListError("It's already on that list.");
  throw new ListError(fallback);
}

export interface MyListSummary { id: string; title: string; is_public: boolean; share_token: string; city_id: string | null; item_count: number; updated_at: string; has: boolean }

/** The user's lists, flagging which already contain the given venue/event (for the "Add to my night" sheet). */
export async function listMyLists(session: SessionContext, contains?: { vendorId?: string; eventId?: string }): Promise<MyListSummary[]> {
  const { data, error } = await session.supabase
    .from("lists")
    .select("id, title, is_public, share_token, city_id, updated_at, items:list_items(vendor_id, event_id)")
    .order("updated_at", { ascending: false });
  if (error) throw new ListError("Couldn't load your lists.");
  return (data ?? []).map((l) => {
    const items = (l.items ?? []) as Array<{ vendor_id: string | null; event_id: string | null }>;
    return {
      id: l.id, title: l.title, is_public: l.is_public, share_token: l.share_token, city_id: l.city_id, updated_at: l.updated_at, item_count: items.length,
      has: Boolean((contains?.vendorId && items.some((i) => i.vendor_id === contains.vendorId)) || (contains?.eventId && items.some((i) => i.event_id === contains.eventId))),
    };
  });
}

export async function createList(session: SessionContext, raw: unknown): Promise<{ id: string; share_token: string }> {
  const input = z.object({ title, cityId: z.uuid().nullish() }).parse(raw);
  await writeLimit(session);
  await assertClean(input.title);
  const { data, error } = await session.supabase.from("lists").insert({ title: input.title, city_id: input.cityId ?? null }).select("id, share_token").single();
  if (error || !data) dbError(error, "Couldn't create the list.");
  return data;
}

const addSchema = z
  .object({ listId: z.uuid().optional(), newListTitle: title.optional(), vendorId: z.uuid().optional(), eventId: z.uuid().optional(), note: note.optional(), cityId: z.uuid().nullish() })
  .refine((v) => Boolean(v.vendorId) !== Boolean(v.eventId), "Add a venue or an event.")
  .refine((v) => Boolean(v.listId) !== Boolean(v.newListTitle), "Choose a list or name a new one.");

/** Add a venue or event to an existing list, or to a new one created on the spot. */
export async function addToList(session: SessionContext, raw: unknown): Promise<{ listId: string }> {
  const input = addSchema.parse(raw);
  const listId = input.listId ?? (await createList(session, { title: input.newListTitle, cityId: input.cityId })).id;
  await writeLimit(session);
  await assertClean(input.note);
  const { count } = await session.supabase.from("list_items").select("id", { count: "exact", head: true }).eq("list_id", listId);
  const { error } = await session.supabase.from("list_items").insert({ list_id: listId, vendor_id: input.vendorId ?? null, event_id: input.eventId ?? null, note: input.note ?? null, sort_order: (count ?? 0) * 10 });
  if (error) dbError(error, "Couldn't add it to your list.");
  return { listId };
}

export async function removeFromList(session: SessionContext, listId: string, item: { vendorId?: string; eventId?: string; itemId?: string }): Promise<void> {
  let q = session.supabase.from("list_items").delete().eq("list_id", z.uuid().parse(listId));
  if (item.itemId) q = q.eq("id", z.uuid().parse(item.itemId));
  else if (item.vendorId) q = q.eq("vendor_id", z.uuid().parse(item.vendorId));
  else if (item.eventId) q = q.eq("event_id", z.uuid().parse(item.eventId));
  else throw new ListError("Nothing to remove.");
  const { error } = await q;
  if (error) throw new ListError("Couldn't remove it.");
}

export async function updateList(session: SessionContext, raw: unknown): Promise<void> {
  const input = z.object({ listId: z.uuid(), title: title.optional(), isPublic: z.boolean().optional() }).parse(raw);
  await writeLimit(session);
  if (input.title) await assertClean(input.title);
  if (input.isPublic) {
    // Going public: re-check everything that becomes visible.
    const { data } = await session.supabase.from("lists").select("title, items:list_items(note)").eq("id", input.listId).single();
    await assertClean(data?.title, ...((data?.items ?? []) as Array<{ note: string | null }>).map((i) => i.note));
  }
  const patch = { ...(input.title ? { title: input.title } : {}), ...(input.isPublic !== undefined ? { is_public: input.isPublic } : {}) };
  const { error } = await session.supabase.from("lists").update(patch).eq("id", input.listId);
  if (error) throw new ListError("Couldn't save the list.");
}

export async function updateItem(session: SessionContext, raw: unknown): Promise<void> {
  const input = z.object({ itemId: z.uuid(), note: note.optional(), move: z.enum(["up", "down"]).optional() }).parse(raw);
  await writeLimit(session);
  if (input.note !== undefined) {
    await assertClean(input.note);
    const { error } = await session.supabase.from("list_items").update({ note: input.note }).eq("id", input.itemId);
    if (error) throw new ListError("Couldn't save the note.");
  }
  if (input.move) {
    const { data: item } = await session.supabase.from("list_items").select("list_id").eq("id", input.itemId).single();
    if (!item) throw new ListError("Item not found.");
    const { data: all } = await session.supabase.from("list_items").select("id, sort_order, created_at").eq("list_id", item.list_id).order("sort_order").order("created_at");
    const ids = (all ?? []).map((i) => i.id);
    const at = ids.indexOf(input.itemId);
    const to = input.move === "up" ? at - 1 : at + 1;
    if (at < 0 || to < 0 || to >= ids.length) return;
    [ids[at], ids[to]] = [ids[to]!, ids[at]!];
    await Promise.all(ids.map((id, i) => session.supabase.from("list_items").update({ sort_order: i * 10 }).eq("id", id)));
  }
}

export async function deleteList(session: SessionContext, listId: string): Promise<void> {
  const { error } = await session.supabase.from("lists").delete().eq("id", z.uuid().parse(listId));
  if (error) throw new ListError("Couldn't delete the list.");
}

export async function getMyList(session: SessionContext, listId: string) {
  const { data } = await session.supabase
    .from("lists")
    .select("id, title, is_public, share_token, view_count, city_id, updated_at, items:list_items(id, note, sort_order, created_at, vendor:vendors(id, slug, name, tagline, cover_image_url, price_band), event:events(id, slug, title, starts_at))")
    .eq("id", z.uuid().parse(listId))
    .maybeSingle();
  if (!data) return null;
  const items = ((data.items ?? []) as Array<{ sort_order: number; created_at: string }>).sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
  return { ...data, items };
}

// ---------------------------------------------------------------------------------------------- public

export interface SharedVendor { id: string; slug: string; name: string; tagline: string | null; price_band: string | null; cover_image_url: string | null; lat: number | null; lng: number | null; category: string | null; area: string | null; min_price: number | null; max_price: number | null }
export interface SharedEvent { id: string; slug: string; title: string; starts_at: string; status: string; venue_name: string | null; is_free: boolean; price_from_ngn: number | null; price_to_ngn: number | null; lat: number | null; lng: number | null }
export type SharedItem = { id: string; note: string | null } & ({ kind: "vendor"; vendor: SharedVendor } | { kind: "event"; event: SharedEvent });
export interface SharedList { id: string; title: string; token: string; updated_at: string; view_count: number; owner: { username: string; display_name: string | null }; city: { slug: string; name: string; lat: number; lng: number } | null; items: SharedItem[] }

export async function getSharedList(token: string): Promise<SharedList | null> {
  if (!/^[A-Za-z0-9_-]{12}$/.test(token)) return null;
  const { data, error } = await getPublicSupabase().rpc("get_shared_list", { p_token: token });
  if (error || !data) return null;
  return data as unknown as SharedList;
}

/**
 * Rough per-person cost for the night: each venue's cheapest listed price (entry or a drink) and
 * each event's ticket price. A range when venues list several prices; items without prices are
 * counted separately so the total is never presented as complete.
 */
export function estimateCost(items: SharedItem[]): { low: number; high: number; priced: number; unpriced: number } {
  let low = 0;
  let high = 0;
  let priced = 0;
  let unpriced = 0;
  for (const it of items) {
    if (it.kind === "vendor") {
      const { min_price: min, max_price: max } = it.vendor;
      if (min === null && max === null) unpriced++;
      else {
        priced++;
        low += min ?? max ?? 0;
        high += max ?? min ?? 0;
      }
    } else {
      const e = it.event;
      if (e.is_free) priced++;
      else if (e.price_from_ngn === null && e.price_to_ngn === null) unpriced++;
      else {
        priced++;
        low += e.price_from_ngn ?? e.price_to_ngn ?? 0;
        high += e.price_to_ngn ?? e.price_from_ngn ?? 0;
      }
    }
  }
  return { low, high, priced, unpriced };
}

/** Counted server-side (service role) behind a per-IP-per-list limit, so refreshes don't inflate it. */
export async function countListView(token: string, ip: string | null): Promise<void> {
  const rl = await rateLimit("listViewIp", `${ip ?? "unknown"}:${token}`);
  if (!rl.ok) return;
  await getAdminSupabase().rpc("admin_increment_list_view", { p_token: token });
}
