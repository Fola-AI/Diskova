/**
 * RLS test fixtures against the DEV Supabase project. Every user/vendor created here is tagged with
 * a run id and removed in cleanup(). Uses the service role ONLY to arrange fixtures and to assert
 * server-side state; every access check runs through anon / user clients over the Data API.
 */
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

export type Client = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasDevEnv = Boolean(url && anonKey && serviceKey);
export const runId = `${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

export function anonClient(): Client {
  return createClient<Database>(url, anonKey, noSession);
}

export function serviceClient(): Client {
  return createClient<Database>(url, serviceKey, noSession);
}

export interface TestUser {
  id: string;
  email: string;
  client: Client;
}

const createdUserIds: string[] = [];
const createdVendorIds: string[] = [];

export async function createUser(label: string, opts: { verified?: boolean } = {}): Promise<TestUser> {
  const admin = serviceClient();
  const email = `rls-${label}-${runId}@example.com`;
  const password = `T3st-${randomBytes(12).toString("hex")}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  createdUserIds.push(data.user.id);

  if (opts.verified === false) {
    const { error: e } = await admin.from("profiles").update({ email_verified_at: null }).eq("id", data.user.id);
    if (e) throw e;
  }

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

/** A published vendor (fixtures only — real publishing is a staff action). */
export async function createPublishedVendor(label: string): Promise<{ id: string; slug: string }> {
  const admin = serviceClient();
  const { data: city } = await admin.from("cities").select("id").eq("slug", "lagos").single();
  const { data: cat } = await admin.from("categories").select("id").eq("slug", "lounge").single();
  if (!city || !cat) throw new Error("Seed data missing: run npm run db:seed");
  const slug = `rls-${label}-${runId}`;
  const { data, error } = await admin
    .from("vendors")
    .insert({
      slug,
      name: `RLS ${label} ${runId}`,
      category_id: cat.id,
      city_id: city.id,
      location: "SRID=4326;POINT(3.4216 6.4281)",
      status: "published",
    })
    .select("id, slug")
    .single();
  if (error) throw error;
  createdVendorIds.push(data.id);
  return data;
}

export async function cleanup(): Promise<void> {
  const admin = serviceClient();
  if (createdVendorIds.length) {
    await admin.from("vendors").delete().in("id", createdVendorIds);
  }
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
  createdUserIds.length = 0;
  createdVendorIds.length = 0;
}
