import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/db/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, images, PWA files and the anonymous live-polling API.
    "/((?!_next/static|_next/image|icons/|icon.png|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml|sw.js|api/live|api/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
