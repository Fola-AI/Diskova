/**
 * Security headers (PRD §7.7). Pure functions so they can be unit-tested and used by next.config.ts.
 * CSP was Report-Only until Stage L13; next.config.ts now enforces it.
 */

export interface SecurityHeaderOptions {
  supabaseUrl: string;
  sentryDsn?: string;
  enforceCsp: boolean;
  isDev: boolean;
}

export interface HeaderEntry {
  key: string;
  value: string;
}

/** Sentry CSP report endpoint derived from a DSN (https://KEY@HOST/PROJECT). */
export function sentryCspReportUri(dsn: string | undefined): string | undefined {
  if (!dsn) return undefined;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return undefined;
    return `https://${url.host}/api/${projectId}/security/?sentry_key=${url.username}`;
  } catch {
    return undefined;
  }
}

function hostOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

export function buildCsp(opts: SecurityHeaderOptions): string {
  const supabaseHost = hostOf(opts.supabaseUrl);
  const sentryHost = hostOf(opts.sentryDsn);
  const supabaseHttp = supabaseHost ? [`https://${supabaseHost}`] : [];
  const supabaseWs = supabaseHost ? [`wss://${supabaseHost}`] : [];
  const sentry = sentryHost ? [`https://${sentryHost}`] : [];

  const mapbox = [
    "https://api.mapbox.com",
    "https://*.tiles.mapbox.com",
    "https://events.mapbox.com",
  ];
  const vercel = ["https://va.vercel-scripts.com", "https://vitals.vercel-insights.com"];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js App Router hydration uses inline scripts. A nonce-based CSP would force every page to
    // render dynamically (no ISR/static), so 'unsafe-inline' stays; no 'unsafe-eval' in production.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(opts.isDev ? ["'unsafe-eval'"] : []),
      ...vercel,
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://api.mapbox.com",
    ],
    "img-src": ["'self'", "data:", "blob:", ...supabaseHttp, "https://api.mapbox.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": [
      "'self'",
      ...supabaseHttp,
      ...supabaseWs,
      ...mapbox,
      ...vercel,
      ...sentry,
      ...(opts.isDev ? ["ws://localhost:*"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "child-src": ["blob:"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "manifest-src": ["'self'"],
  };

  const reportUri = sentryCspReportUri(opts.sentryDsn);
  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  // Browsers ignore upgrade-insecure-requests in a Report-Only policy, so only send it when enforcing.
  if (opts.enforceCsp && !opts.isDev) parts.push("upgrade-insecure-requests");
  if (reportUri) parts.push(`report-uri ${reportUri}`);
  return parts.join("; ");
}

export function buildSecurityHeaders(opts: SecurityHeaderOptions): HeaderEntry[] {
  return [
    {
      key: opts.enforceCsp ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
      value: buildCsp(opts),
    },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
