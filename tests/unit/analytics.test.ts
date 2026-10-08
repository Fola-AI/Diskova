import { afterEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("@vercel/analytics", () => ({ track }));

const { trackEvent } = await import("@/lib/analytics");

function withCookie(cookie: string) {
  vi.stubGlobal("document", { cookie });
}

describe("custom analytics events (L14)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    track.mockReset();
  });

  it("send nothing without analytics consent", () => {
    withCookie("");
    trackEvent("pulse_submitted", { crowd: 3 });
    withCookie("consent=essential");
    trackEvent("pulse_submitted", { crowd: 3 });
    expect(track).not.toHaveBeenCalled();
  });

  it("send the event name and coarse props with consent", () => {
    withCookie("sb-x=1; consent=analytics");
    trackEvent("share_clicked", { channel: "whatsapp" });
    expect(track).toHaveBeenCalledWith("share_clicked", { channel: "whatsapp" });
  });

  it("never throws, even if the analytics client does", () => {
    withCookie("consent=analytics");
    track.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => trackEvent("map_opened")).not.toThrow();
  });
});
