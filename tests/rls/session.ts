import type { SessionContext } from "@/lib/auth/guards";

import type { TestUser } from "./helpers";

/** Build a SessionContext for services from a signed-in test user (RLS still applies to its client). */
export async function sessionFor(u: TestUser): Promise<SessionContext> {
  const { data } = await u.client.rpc("get_my_profile");
  const { data: auth } = await u.client.auth.getUser();
  return { supabase: u.client as never, user: auth.user!, profile: data![0] } as SessionContext;
}
