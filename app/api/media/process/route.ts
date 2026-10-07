import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/guards";
import { isOwnIncomingPath } from "@/lib/media/uploads";
import { rateLimit, retryAfterText } from "@/lib/ratelimit";
import { AvatarError, processAvatar } from "@/lib/services/avatar";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  path: z.string().min(10).max(200),
  purpose: z.enum(["avatar"]), // "post" joins in Stage L6
});

/** Processes exactly ONE image per invocation (§7.6, CLAUDE.md). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!session.profile.email_verified_at || ["suspended", "banned"].includes(session.profile.status)) {
    return NextResponse.json({ error: "Your account can't upload images right now." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { path, purpose } = parsed.data;
  if (!isOwnIncomingPath(session.user.id, path)) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 403 });
  }

  const rl = await rateLimit("mediaUser", session.user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `You've uploaded a lot of photos. Try again in ${retryAfterText(rl.reset)}.` },
      { status: 429 },
    );
  }

  try {
    if (purpose === "avatar") {
      const avatarUrl = await processAvatar(session.user.id, path);
      const { error } = await session.supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", session.user.id);
      if (error) throw error;
      return NextResponse.json({ avatarUrl });
    }
    return NextResponse.json({ error: "Unsupported purpose." }, { status: 400 });
  } catch (err) {
    if (err instanceof AvatarError) return NextResponse.json({ error: err.message }, { status: 422 });
    Sentry.captureException(err, { tags: { area: "media-process", purpose } });
    return NextResponse.json({ error: "We couldn't process that image. Please try another." }, { status: 500 });
  }
}
