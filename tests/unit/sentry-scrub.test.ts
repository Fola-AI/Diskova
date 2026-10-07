import { describe, expect, it } from "vitest";

import { scrubEvent, scrubString } from "@/lib/sentry/scrub";

describe("Sentry scrubbing (PRD §7.8)", () => {
  it("redacts emails, IPs and tokens in strings", () => {
    const s = scrubString(
      "user ada@example.com from 102.89.3.4 sent Bearer abcdefghijklmnop and eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0NTY3.SflKxwRJSMeKKF2QT4",
    );
    expect(s).not.toContain("ada@example.com");
    expect(s).not.toContain("102.89.3.4");
    expect(s).not.toContain("abcdefghijklmnop");
    expect(s).not.toContain("eyJhbGciOiJIUzI1");
  });

  it("redacts Supabase keys and query-string secrets", () => {
    expect(scrubString("key sb_secret_AbCdEf123456789")).not.toContain("AbCdEf123456789");
    const url = scrubString("https://x.io/cb?code=abc123&token=zzz&ok=1");
    expect(url).toContain("code=[redacted]");
    expect(url).toContain("token=[redacted]");
    expect(url).toContain("ok=1");
  });

  it("drops sensitive keys in nested objects", () => {
    const event = {
      message: "hello",
      user: { id: "u1", email: "a@b.co", ip_address: "1.2.3.4" },
      request: {
        headers: { Authorization: "Bearer secret-token-123", cookie: "sb=1", accept: "*/*" },
      },
      extra: { list: ["call 08012345678", "mail x@y.ng"] },
    };
    const out = scrubEvent(event);
    expect(out.user.email).toBe("[redacted]");
    expect(out.user.ip_address).toBe("[redacted]");
    expect(out.user.id).toBe("u1");
    expect(out.request.headers.Authorization).toBe("[redacted]");
    expect(out.request.headers.cookie).toBe("[redacted]");
    expect(out.request.headers.accept).toBe("*/*");
    expect(out.extra.list[1]).not.toContain("x@y.ng");
  });

  it("does not mutate the original event", () => {
    const event = { user: { email: "a@b.co" } };
    scrubEvent(event);
    expect(event.user.email).toBe("a@b.co");
  });
});

describe("Sentry wiring (CLAUDE.md: errors + tracing only, no PII)", async () => {
  const { sentrySharedOptions } = await import("../../sentry.shared");
  const { listSourceFiles, read, rel } = await import("../helpers/source-files");

  it("scrubs events, spans and breadcrumbs; no default PII; 10% tracing; logs off", () => {
    expect(sentrySharedOptions.beforeSend).toBe(scrubEvent);
    expect(sentrySharedOptions.beforeSendSpan).toBe(scrubEvent);
    expect(sentrySharedOptions.beforeBreadcrumb).toBe(scrubEvent);
    expect(sentrySharedOptions.sendDefaultPii).toBe(false);
    expect(sentrySharedOptions.tracesSampleRate).toBe(0.1);
    expect(sentrySharedOptions.enableLogs).toBe(false);
  });

  it("a realistic server error event leaves nothing identifying", () => {
    const out = scrubEvent({
      exception: { values: [{ value: "insert failed for fola@diskova.io (sb_secret_abcdefghijk1234) from 2001:db8:85a3::8a2e:370:7334" }] },
      request: { url: "https://diskova.io/auth/callback?token_hash=pkce_abc123&type=signup", headers: { "x-forwarded-for": "102.89.3.4" } },
      breadcrumbs: [{ message: "fetch https://x.supabase.co/rest/v1/posts?apikey=sb_publishable_zzzzzzzzzz" }],
    });
    const json = JSON.stringify(out);
    for (const leak of ["fola@diskova.io", "sb_secret_abcdefghijk1234", "2001:db8:85a3", "102.89.3.4", "sb_publishable_zzzzzzzzzz"]) expect(json).not.toContain(leak);
  });

  it("no Session Replay, profiling or Sentry logs integration is used anywhere", () => {
    const offenders = listSourceFiles(["app", "components", "lib", "instrumentation-client.ts", "instrumentation.ts", "sentry.server.config.ts", "sentry.edge.config.ts", "next.config.ts"], [".ts", ".tsx"])
      .filter((f) => /replayIntegration|browserProfilingIntegration|nodeProfilingIntegration|profilesSampleRate|replaysSessionSampleRate/.test(read(f)))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
