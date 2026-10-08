import { describe, expect, it } from "vitest";

import { buildCalendar, escapeText, foldLine, formatUtc } from "@/lib/events/ical";
import { eventSubmitSchema, localToUtcIso } from "@/lib/validation/events";

/** Structural RFC 5545 validator used by the tests. */
function validate(ics: string): string[] {
  const errors: string[] = [];
  if (!ics.endsWith("\r\n")) errors.push("must end with CRLF");
  if (/(?<!\r)\n/.test(ics)) errors.push("bare LF found");
  const physical = ics.split("\r\n").slice(0, -1);
  const enc = new TextEncoder();
  physical.forEach((l, i) => enc.encode(l).length > 75 && errors.push(`line ${i + 1} > 75 octets`));
  const logical = ics.replace(/\r\n /g, "").split("\r\n").filter(Boolean);
  const stack: string[] = [];
  for (const l of logical) {
    if (!/^[A-Z-]+[;:]/.test(l)) errors.push(`bad content line: ${l.slice(0, 30)}`);
    if (l.startsWith("BEGIN:")) stack.push(l.slice(6));
    if (l.startsWith("END:") && stack.pop() !== l.slice(4)) errors.push(`unbalanced ${l}`);
  }
  if (stack.length) errors.push("unclosed components");
  const events = ics.replace(/\r\n /g, "").split("BEGIN:VEVENT").slice(1);
  for (const ev of events) {
    for (const prop of ["UID:", "DTSTAMP:", "DTSTART:", "SUMMARY:"]) if (!ev.includes(`\r\n${prop}`)) errors.push(`VEVENT missing ${prop}`);
    if (!/DTSTART:\d{8}T\d{6}Z/.test(ev)) errors.push("DTSTART not UTC");
  }
  for (const req of ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:"]) if (!ics.includes(req)) errors.push(`missing ${req}`);
  return errors;
}

describe("iCalendar (RFC 5545)", () => {
  const ics = buildCalendar({
    name: "December in Nigeria, Lagos",
    prodId: "-//Test//Events//EN",
    now: new Date("2026-10-07T12:00:00Z"),
    events: [
      {
        uid: "abc@example.com",
        title: "Beach party; sunset, Afrobeats & more",
        description: "Line one\nLine two with a very long description that will definitely need folding because it is longer than seventy-five octets — ₦10,000 entry",
        location: "Sandbar Cove, Ajah, Lagos",
        url: "https://example.com/e/abc",
        start: new Date("2026-12-20T20:00:00Z"),
      },
      { uid: "def@example.com", title: "Cancelled show", start: new Date("2026-12-21T19:00:00Z"), status: "CANCELLED" },
    ],
  });

  it("is structurally valid", () => {
    expect(validate(ics)).toEqual([]);
  });

  it("escapes TEXT values and uses UTC times", () => {
    expect(ics).toContain("SUMMARY:Beach party\; sunset\\, Afrobeats & more");
    expect(ics).toContain("DTSTART:20261220T200000Z");
    expect(ics).toContain("DTEND:20261220T230000Z"); // default 3 h
    expect(ics).toContain("STATUS:CANCELLED");
    expect(escapeText("a\\b")).toBe("a\\\\b");
    expect(formatUtc(new Date("2026-01-02T03:04:05.678Z"))).toBe("20260102T030405Z");
  });

  it("folds long lines (multi-byte safe)", () => {
    const folded = foldLine(`DESCRIPTION:${"₦".repeat(60)}`);
    for (const l of folded.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(`DESCRIPTION:${"₦".repeat(60)}`);
  });
});

describe("event submission validation", () => {
  const base = {
    title: "Rooftop Sessions",
    city_id: "00000000-0000-4000-8000-000000000001",
    venue_name_freeform: "Some rooftop",
    starts_local: "2026-12-20T21:00",
    category: "party",
  };
  it("converts Lagos local time to UTC", () => {
    expect(localToUtcIso("2026-12-20T21:00")).toBe("2026-12-20T20:00:00.000Z");
  });
  it("requires a venue and a sane end time / price range", () => {
    expect(eventSubmitSchema.safeParse(base).success).toBe(true);
    expect(eventSubmitSchema.safeParse({ ...base, venue_name_freeform: "" }).success).toBe(false);
    expect(eventSubmitSchema.safeParse({ ...base, ends_local: "2026-12-20T20:00" }).success).toBe(false);
    expect(eventSubmitSchema.safeParse({ ...base, price_from_ngn: "10000", price_to_ngn: "5000" }).success).toBe(false);
    expect(eventSubmitSchema.safeParse({ ...base, ticket_url: "javascript:alert(1)" }).success).toBe(false);
  });
});
