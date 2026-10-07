import { SENTRY_DSN } from "@/lib/config";
import { scrubEvent } from "@/lib/sentry/scrub";

/**
 * Shared Sentry options (CLAUDE.md): errors + tracing only, tracesSampleRate 0.1.
 * Session replay, profiling and logs are OFF for privacy and quota. No default PII.
 */
export const sentrySharedOptions = {
  dsn: SENTRY_DSN || undefined,
  enabled: Boolean(SENTRY_DSN) && process.env.NODE_ENV !== "test",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  enableLogs: false,
  beforeSend: scrubEvent,
  beforeSendSpan: scrubEvent,
  beforeBreadcrumb: scrubEvent,
};
