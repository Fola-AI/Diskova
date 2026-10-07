import { describe, expect, it } from "vitest";

import { buildCsp, buildSecurityHeaders, sentryCspReportUri } from "@/lib/security/headers";

const base = {
  supabaseUrl: "https://abc123.supabase.co",
  sentryDsn: "https://publickey@o42.ingest.de.sentry.io/777",
  enforceCsp: false,
  isDev: false,
};

function headerMap(opts = base): Map<string, string> {
  return new Map(buildSecurityHeaders(opts).map((h) => [h.key, h.value]));
}

describe("security headers (PRD §7.7)", () => {
  it("sends CSP as Report-Only until L13", () => {
    const h = headerMap();
    expect(h.has("Content-Security-Policy-Report-Only")).toBe(true);
    expect(h.has("Content-Security-Policy")).toBe(false);
  });

  it("enforces CSP when enforceCsp is true", () => {
    const h = headerMap({ ...base, enforceCsp: true });
    expect(h.has("Content-Security-Policy")).toBe(true);
  });

  it("sets HSTS, frame, referrer, nosniff and permissions headers", () => {
    const h = headerMap();
    expect(h.get("Strict-Transport-Security")).toMatch(/max-age=\d{8,}/);
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Permissions-Policy")).toContain("geolocation=(self)");
  });

  it("allows exactly the expected third-party hosts", () => {
    const csp = buildCsp(base);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("https://abc123.supabase.co");
    expect(csp).toContain("wss://abc123.supabase.co");
    expect(csp).toContain("https://api.mapbox.com");
    expect(csp).toContain("https://*.tiles.mapbox.com");
    expect(csp).toContain("https://events.mapbox.com");
    expect(csp).toContain("https://o42.ingest.de.sentry.io");
    expect(csp).toContain("https://fonts.googleapis.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("only sends upgrade-insecure-requests when the policy is enforced", () => {
    expect(buildCsp(base)).not.toContain("upgrade-insecure-requests");
    expect(buildCsp({ ...base, enforceCsp: true })).toContain("upgrade-insecure-requests");
  });

  it("allows unsafe-eval only in development", () => {
    expect(buildCsp({ ...base, isDev: true })).toContain("'unsafe-eval'");
  });

  it("derives the Sentry CSP report endpoint from the DSN", () => {
    expect(sentryCspReportUri(base.sentryDsn)).toBe(
      "https://o42.ingest.de.sentry.io/api/777/security/?sentry_key=publickey",
    );
    expect(sentryCspReportUri(undefined)).toBeUndefined();
    expect(sentryCspReportUri("not a url")).toBeUndefined();
    expect(buildCsp(base)).toContain(
      "report-uri https://o42.ingest.de.sentry.io/api/777/security/",
    );
  });
});
