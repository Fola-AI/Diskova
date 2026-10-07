import { NextResponse, type NextRequest } from "next/server";

import { getServerSupabase } from "@/lib/db/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
