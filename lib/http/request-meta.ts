import { headers } from "next/headers";

/**
 * Client IP / UA for rate limiting and informational logging. Vercel sets x-forwarded-for
 * (first entry = client) and x-real-ip. IPs are treated as weak signals: many Nigerian mobile
 * users share one IP via carrier-grade NAT (§7.5, §7.10).
 */
export function clientIpFrom(h: Headers): string | null {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip")?.trim() || null;
  if (!ip) return null;
  // Accept IPv4 / IPv6 shapes only, so the value is safe to pass to an inet column.
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  return { ip: clientIpFrom(h), userAgent: h.get("user-agent")?.slice(0, 500) ?? null };
}
