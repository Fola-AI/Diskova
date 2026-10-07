/**
 * Sends one test event to Sentry (L1 acceptance). Run: npm run sentry:test
 * Uses the same scrubbing options as the app.
 */
import * as Sentry from "@sentry/nextjs";

import { sentrySharedOptions } from "../sentry.shared";

async function main(): Promise<void> {
  if (!sentrySharedOptions.dsn) {
    console.error("NEXT_PUBLIC_SENTRY_DSN is not set; cannot send a test event.");
    process.exit(1);
  }
  Sentry.init({ ...sentrySharedOptions, enabled: true, environment: "development" });
  const eventId = Sentry.captureMessage(
    "L1 Sentry test event (email test@example.com and IP 10.0.0.1 should be redacted)",
    "info",
  );
  const flushed = await Sentry.flush(5000);
  console.log(`Sentry test event id: ${eventId} · flushed: ${flushed}`);
  if (!flushed) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
