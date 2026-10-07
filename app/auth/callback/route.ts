import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/auth/safe-next";
import { getServerSupabase } from "@/lib/db/server";

const OTP_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Lands every auth link:
 *  - ?code=…              PKCE: OAuth (Google) and default Supabase email templates (same browser)
 *  - ?token_hash=…&type=… server-side verification (works across devices; recommended email templates)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const defaultNext = type === "recovery" ? "/reset/update" : "/me";
  const next = safeNext(url.searchParams.get("next"), defaultNext);

  const supabase = await getServerSupabase();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  const target = new URL(ok ? next : "/login?error=link", url.origin);
  return NextResponse.redirect(target, { status: 303 });
}
