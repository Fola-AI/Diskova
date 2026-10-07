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
