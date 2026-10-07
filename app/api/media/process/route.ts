import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/guards";
import { isOwnIncomingPath } from "@/lib/media/uploads";
import { rateLimit, retryAfterText } from "@/lib/ratelimit";
import { AvatarError, processAvatar } from "@/lib/services/avatar";
import { attachCheckinPhoto, PostError } from "@/lib/services/posts";
import { processVendorAsset, VendorAssetError } from "@/lib/services/vendor-assets";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  path: z.string().min(10).max(200),
  // Official-update photos are processed inside their Server Action (still one image per invocation).
  purpose: z.enum(["avatar", "vendor_cover", "vendor_logo", "vendor_gallery", "post"]),
  vendorId: z.uuid().optional(),
  postId: z.uuid().optional(),
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
  const { path, purpose, vendorId, postId } = parsed.data;
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
    if (purpose === "post") {
      if (!postId) return NextResponse.json({ error: "Missing post." }, { status: 400 });
      const { mediaId } = await attachCheckinPhoto(session, postId, path);
      return NextResponse.json({ mediaId });
    }
    if (!vendorId) return NextResponse.json({ error: "Missing venue." }, { status: 400 });
    const kind = purpose === "vendor_cover" ? "cover" : purpose === "vendor_logo" ? "logo" : "gallery";
    const { url } = await processVendorAsset(session, vendorId, kind, path);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof AvatarError || err instanceof VendorAssetError || err instanceof PostError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    Sentry.captureException(err, { tags: { area: "media-process", purpose } });
    return NextResponse.json({ error: "We couldn't process that image. Please try another." }, { status: 500 });
  }
}
